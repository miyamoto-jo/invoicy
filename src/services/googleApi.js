/**
 * Google API クライアント
 * Google APIs へのアクセスを抽象化し、エンドポイントの管理を一元化
 */

import { API_CONFIG } from '../config/api.js'

export class GoogleApiClient {
  constructor() {
    this.config = API_CONFIG.GOOGLE
  }

  /**
   * OAuth2 API エンドポイント
   */
  getTokenInfoUrl(accessToken) {
    return `${this.config.OAUTH2.TOKEN_INFO}?access_token=${accessToken}`
  }

  getUserInfoUrl() {
    return this.config.OAUTH2.USER_INFO
  }

  /**
   * Drive API エンドポイント
   */
  getDriveFilesUrl() {
    return this.config.DRIVE.FILES
  }

  getDriveFileUrl(fileId, params = {}) {
    const queryString = Object.keys(params).length > 0 
      ? '?' + new URLSearchParams(params).toString()
      : ''
    return `${this.config.DRIVE.FILES}/${fileId}${queryString}`
  }

  getDriveFilesSearchUrl(query, fields = 'files(id,name)') {
    const params = new URLSearchParams({
      q: query,
      fields: fields
    })
    return `${this.config.DRIVE.FILES}?${params.toString()}`
  }

  getDriveFileUploadUrl(fileId, uploadType = 'media') {
    return `${this.config.DRIVE.UPLOAD_FILES}/${fileId}?uploadType=${uploadType}`
  }

  /**
   * 認証スコープ
   */
  getScopes() {
    return [
      this.config.SCOPES.OPENID,
      this.config.SCOPES.EMAIL,
      this.config.SCOPES.PROFILE,
      this.config.SCOPES.DRIVE_FILE
    ].join(' ')
  }

  /**
   * 共通のHTTPリクエストヘルパー
   */
  async makeRequest(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }

    const response = await fetch(url, { ...defaultOptions, ...options })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response
  }

  /**
   * 認証ヘッダー付きリクエスト
   */
  async makeAuthenticatedRequest(url, token, options = {}) {
    return this.makeRequest(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    })
  }

  /**
   * JSONレスポンスを取得
   */
  async getJsonResponse(url, token, options = {}) {
    const response = await this.makeAuthenticatedRequest(url, token, options)
    return response.json()
  }

  /**
   * ファイル内容を取得
   */
  async getFileContent(token, fileId) {
    const url = this.getDriveFileUrl(fileId, { alt: 'media' })
    const response = await this.makeAuthenticatedRequest(url, token)
    return response.json()
  }

  /**
   * ファイル内容を更新
   */
  async updateFileContent(token, fileId, content) {
    const url = this.getDriveFileUploadUrl(fileId, 'media')
    return this.makeAuthenticatedRequest(url, token, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(content)
    })
  }

  /**
   * ファイルを検索
   */
  async searchFiles(token, query, fields = 'files(id,name)') {
    const url = this.getDriveFilesSearchUrl(query, fields)
    return this.getJsonResponse(url, token)
  }

  /**
   * ファイルを作成
   */
  async createFile(token, fileData) {
    const url = this.getDriveFilesUrl()
    return this.makeAuthenticatedRequest(url, token, {
      method: 'POST',
      body: JSON.stringify(fileData)
    })
  }

  /**
   * ファイルを削除
   */
  async deleteFile(token, fileId) {
    const url = this.getDriveFileUrl(fileId)
    return this.makeAuthenticatedRequest(url, token, {
      method: 'DELETE'
    })
  }

  /**
   * フォルダを作成
   */
  async createFolder(token, name, parentId = null) {
    const fileData = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder'
    }
    
    if (parentId) {
      fileData.parents = [parentId]
    }

    const response = await this.createFile(token, fileData)
    return response.json()
  }

  /**
   * フォルダを検索
   */
  async searchFolder(token, name, parentId = null) {
    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    
    if (parentId) {
      query += ` and '${parentId}' in parents`
    }

    return this.searchFiles(token, query)
  }
}

// シングルトンインスタンス
export const googleApiClient = new GoogleApiClient()
