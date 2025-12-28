/**
 * API設定ファイル
 * Google APIs のエンドポイントとスコープを一元管理
 */

// 環境変数からベースURLを取得（デフォルトは本番環境）
const GOOGLE_API_BASE = import.meta.env.VITE_GOOGLE_API_BASE || 'https://www.googleapis.com'

export const API_CONFIG = {
  GOOGLE: {
    // OAuth2 API エンドポイント
    OAUTH2: {
      TOKEN_INFO: `${GOOGLE_API_BASE}/oauth2/v1/tokeninfo`,
      USER_INFO: `${GOOGLE_API_BASE}/oauth2/v2/userinfo`
    },
    
    // Drive API エンドポイント
    DRIVE: {
      BASE_URL: `${GOOGLE_API_BASE}/drive/v3`,
      UPLOAD_URL: `${GOOGLE_API_BASE}/upload/drive/v3`,
      FILES: `${GOOGLE_API_BASE}/drive/v3/files`,
      UPLOAD_FILES: `${GOOGLE_API_BASE}/upload/drive/v3/files`,
      ABOUT: `${GOOGLE_API_BASE}/drive/v3/about`
    },
    
    // 認証スコープ
    SCOPES: {
      OPENID: 'openid',
      EMAIL: 'email',
      PROFILE: 'profile',
      DRIVE_FILE: `${GOOGLE_API_BASE}/auth/drive.file`,
      DRIVE_METADATA: `${GOOGLE_API_BASE}/auth/drive.metadata.readonly`
    }
  }
}

// アプリケーション固有の設定
export const APP_CONFIG = {
  // アプリフォルダ名
  FOLDER_NAME: import.meta.env.VITE_APP_FOLDER_NAME || 'Invoicy',
  
  // サブフォルダ
  SUB_FOLDERS: ['masters', 'sales', 'invoices'],
  
  // ファイル名
  FILES: {
    CUSTOMERS: 'customers.jsonl',
    PRODUCTS: 'products.jsonl',
    TAXES: 'taxes.json',
    SETTING: 'setting.json'
  }
}

// ローカルストレージキー
export const STORAGE_KEYS = {
  USER_INFO: 'invoicy_user_info',
  BUSINESS_SETTINGS: 'invoicy_business_settings',
  APP_FOLDER_ID: 'invoicy_app_folder_id',
  PRODUCTS_CACHE: 'invoicy_products_cache',
  CUSTOMERS_CACHE: 'invoicy_customers_cache',
  TAXES_CACHE: 'invoicy_taxes_cache'
}

// サブフォルダのストレージキーを生成するヘルパー関数
export const getSubFolderStorageKey = (folderName) => `invoicy_${folderName}_folder_id`
