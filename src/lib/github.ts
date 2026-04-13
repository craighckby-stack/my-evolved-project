export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
}

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

interface GitHubErrorResponse {
  message: string;
  documentation_url?: string;
}

class GitHubService {
  private token: string;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
  }

  private async fetchAPI<T>(endpoint: string, retries = 3, backoff = 1000, method = 'GET', body?: any): Promise<T> {
    const path = endpoint ? `/${endpoint}` : '';
    const url = `https://api.github.com/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}${path}`;
    
    for (let i = 0; i < retries; i++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const options: RequestInit = {
          method,
          headers: {
            Authorization: `token ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        };

        if (body) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        if (response.status === 403 || response.status === 429) {
          const rateLimitReset = response.headers.get('X-RateLimit-Reset');
          const waitTime = rateLimitReset 
            ? Math.max(0, (parseInt(rateLimitReset) * 1000) - Date.now()) + 1000
            : backoff * Math.pow(2, i);
          
          if (i < retries - 1) {
            console.warn(`GitHub Rate Limit hit. Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }

        if (!response.ok) {
          let errorMsg = response.statusText;
          try {
            const errorBody: GitHubErrorResponse = await response.json();
            errorMsg = errorBody.message || errorMsg;
          } catch (e) {}
          throw new Error(`GitHub API Error: ${errorMsg} (${response.status})`);
        }
        
        // DELETE often returns 204 No Content
        if (response.status === 204) return true as T;
        
        return response.json() as T;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
            continue;
          }
          throw new Error(`GitHub API Request Timeout: ${url}`);
        }
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
          continue;
        }
        throw err;
      }
    }
    
    throw new Error(`Max retries exceeded for ${url}`);
  }

  private async fetchUserAPI<T>(endpoint: string, retries = 3): Promise<T> {
    const url = `https://api.github.com/${endpoint}`;
    
    for (let i = 0; i < retries; i++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `token ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.status === 403 || response.status === 429) {
          const rateLimitReset = response.headers.get('X-RateLimit-Reset');
          const waitTime = rateLimitReset 
            ? Math.max(0, (parseInt(rateLimitReset) * 1000) - Date.now()) + 1000
            : 1000 * Math.pow(2, i);
          
          if (i < retries - 1) {
            console.warn(`GitHub Rate Limit hit. Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        if (!response.ok) {
          let errorMsg = response.statusText;
          try {
            const errorBody: GitHubErrorResponse = await response.json();
            errorMsg = errorBody.message || errorMsg;
          } catch (e) {}
          throw new Error(`GitHub API Error: ${errorMsg} (${response.status})`);
        }
        
        return response.json() as T;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            continue;
          }
          throw new Error(`GitHub API Request Timeout: ${url}`);
        }
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
          continue;
        }
        throw err;
      }
    }
    
    throw new Error(`Max retries exceeded for ${url}`);
  }

  private encodeBase64(content: string): string {
    const bytes = new TextEncoder().encode(content);
    return btoa(String.fromCharCode(...bytes));
  }

  private decodeBase64(base64: string): string {
    const binary = atob(base64.replace(/\n/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  async listUserRepos(): Promise<any[]> {
    return this.fetchUserAPI('user/repos?sort=updated&per_page=100');
  }

  async getContents(path: string = ''): Promise<GitHubFile[]> {
    return this.fetchAPI<GitHubFile[]>(`contents/${path}`);
  }

  async getFile(path: string, branch?: string): Promise<GitHubFile> {
    const endpoint = `contents/${encodeURIComponent(path)}${branch ? `?ref=${encodeURIComponent(branch)}` : ''}`;
    return this.fetchAPI<GitHubFile>(endpoint);
  }

  async getAllFiles(branch: string = 'main', filters?: {
    excludePaths?: string[];
    includeOnly?: string[];
  }): Promise<GitHubFile[]> {
    console.log(`GitHubService: Fetching recursive tree for branch ${branch}...`);
    const tree = await this.fetchAPI<GitHubTreeResponse>(`git/trees/${encodeURIComponent(branch)}?recursive=1`);
    if (!tree.tree) {
      console.log(`GitHubService: No tree found for branch ${branch}.`);
      return [];
    }
    
    console.log(`GitHubService: Tree fetched with ${tree.tree.length} items.`);
    
    const defaultExclusions = ['node_modules', 'dist/', 'build/', '.git/', '.next/', 'coverage/'];
    const excludePaths = filters?.excludePaths || defaultExclusions;
    
    return tree.tree
      .filter((item: GitHubTreeItem) => item.type === 'blob')
      .map((item: GitHubTreeItem) => ({
        name: item.path.split('/').pop() || '',
        path: item.path,
        sha: item.sha,
        size: item.size || 0,
        url: item.url,
        html_url: `https://github.com/${this.owner}/${this.repo}/blob/${branch}/${item.path}`,
        git_url: item.url,
        download_url: `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${branch}/${item.path}`,
        type: 'file' as const
      }))
      .filter((item: GitHubFile) => {
        // Check exclusions
        const isExcluded = excludePaths.some(exclude => 
          item.path.includes(exclude) || item.path.startsWith(exclude)
        );
        
        // Check inclusions (if specified)
        const isIncluded = filters?.includeOnly 
          ? filters.includeOnly.some(include => 
              item.path.includes(include) || item.path.startsWith(include)
            )
          : true;
        
        return !isExcluded && isIncluded;
      });
  }

  async getFileContent(sha: string): Promise<string> {
    const data = await this.fetchAPI<{ content: string }>(`git/blobs/${sha}`);
    if (data.content) {
      const content = this.decodeBase64(data.content);
      
      // Check for HTML content in what should be a code file
      if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')) {
        throw new Error(`Fetched content for blob ${sha} appears to be HTML (likely a 404 or error page).`);
      }
      
      return content;
    }
    throw new Error(`No content found for blob ${sha}`);
  }

  async getFileCommits(path: string): Promise<any[]> {
    return this.fetchAPI<any[]>(`commits?path=${encodeURIComponent(path)}`);
  }

  async getDefaultBranch(): Promise<string> {
    const repoInfo = await this.fetchAPI<{ default_branch: string }>('');
    return repoInfo.default_branch || 'main';
  }

  async listBranches(): Promise<any[]> {
    return this.fetchAPI<any[]>('branches');
  }

  async deleteBranch(branchName: string): Promise<boolean> {
    const endpoint = `git/refs/heads/${encodeURIComponent(branchName)}`;
    await this.fetchAPI(endpoint, 3, 1000, 'DELETE');
    return true;
  }

  async updateFile(path: string, content: string, message: string, branch: string, sha?: string) {
    const base64Content = this.encodeBase64(content);
    return this.updateFileRaw(path, base64Content, message, branch, sha);
  }

  async updateFileRaw(path: string, base64Content: string, message: string, branch: string, sha?: string) {
    const endpoint = `contents/${encodeURIComponent(path)}`;
    const body = {
      message,
      content: base64Content,
      branch,
    };
    
    if (sha) {
      body.sha = sha;
    }

    return this.fetchAPI(endpoint, 3, 1000, 'PUT', body);
  }

  async createBranch(branchName: string, baseBranch: string = 'main') {
    const baseRef = await this.fetchAPI<{ object: { sha: string } }>(`git/refs/heads/${baseBranch}`);
    const sha = baseRef.object.sha;
    
    const body = {
      ref: `refs/heads/${branchName}`,
      sha,
    };

    return this.fetchAPI('git/refs', 3, 1000, 'POST', body);
  }
}
