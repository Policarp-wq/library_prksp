import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'

const AUTH_STORAGE_KEY = 'library-auth-session'

const OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_OAUTH_CLIENT_ID ?? '',
  authorizationEndpoint: import.meta.env.VITE_OAUTH_AUTH_URL ?? '',
  tokenEndpoint: import.meta.env.VITE_OAUTH_TOKEN_URL ?? '',
  redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI ?? `${window.location.origin}/auth/callback`,
  scope: import.meta.env.VITE_OAUTH_SCOPE ?? 'openid profile roles',
}

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  id_token?: string
}

interface JwtPayload {
  sub?: string
  preferred_username?: string
  name?: string
  roles?: string[]
  realm_access?: {
    roles?: string[]
  }
  exp?: number
}

export interface AuthUser {
  id: string
  name: string
  roles: string[]
}

export interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthApiResponse {
  token: string;
  user: {
    id: number | string;
    username: string;
    role: string;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  idToken: string | null;
  status: "idle" | "loading" | "failed";
  error: string | null;
}

interface PkceCallbackArgs {
  code: string;
  codeVerifier: string;
}

interface MockAuthPayload {
  name: string;
  roles: string[];
}

function decodeJwtPayload(token: string): JwtPayload {
  const payloadPart = token.split(".")[1];

  if (!payloadPart) {
    return {};
  }

  const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  try {
    const decoded = atob(padded);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return {};
  }
}

function extractRoles(payload: JwtPayload) {
  const fromClaim = Array.isArray(payload.roles) ? payload.roles : [];
  const fromRealm = Array.isArray(payload.realm_access?.roles)
    ? payload.realm_access.roles
    : [];

  return [...new Set([...fromClaim, ...fromRealm])];
}

function buildUserFromToken(token: string): AuthUser {
  const payload = decodeJwtPayload(token);
  const roles = extractRoles(payload);

  return {
    id: payload.sub ?? "unknown",
    name: payload.preferred_username ?? payload.name ?? "Пользователь",
    roles,
  };
}

function readStoredAuth(): AuthState | null {
  const value = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthState;
  } catch {
    return null;
  }
}

const initialState: AuthState = readStoredAuth() ?? {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  idToken: null,
  status: "idle",
  error: null,
};

export const completePkceLogin = createAsyncThunk<
  { accessToken: string; idToken: string | null; user: AuthUser },
  PkceCallbackArgs,
  { rejectValue: string }
>("auth/completePkceLogin", async ({ code, codeVerifier }, thunkApi) => {
  if (!OAUTH_CONFIG.clientId || !OAUTH_CONFIG.tokenEndpoint) {
    return thunkApi.rejectWithValue(
      "Не настроен OAuth провайдер. Заполните переменные окружения VITE_OAUTH_CLIENT_ID и VITE_OAUTH_TOKEN_URL."
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: OAUTH_CONFIG.clientId,
    redirect_uri: OAUTH_CONFIG.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(OAUTH_CONFIG.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    return thunkApi.rejectWithValue("Не удалось получить токен авторизации.");
  }

  const tokenResponse = (await response.json()) as TokenResponse;

  if (!tokenResponse.access_token) {
    return thunkApi.rejectWithValue("OAuth провайдер не вернул access_token.");
  }

  const user = buildUserFromToken(
    tokenResponse.id_token ?? tokenResponse.access_token
  );

  return {
    accessToken: tokenResponse.access_token,
    idToken: tokenResponse.id_token ?? null,
    user,
  };
});

export const loginWithCredentials = createAsyncThunk<
  { accessToken: string; idToken: null; user: AuthUser },
  LoginCredentials,
  { rejectValue: string }
>("auth/loginWithCredentials", async (credentials, thunkApi) => {
  const authErrorMessage = "Ошибка сервера при авторизации";
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return thunkApi.rejectWithValue("Неверные учетные данные");
      }
      return thunkApi.rejectWithValue(authErrorMessage);
    }

    const data = (await response.json()) as AuthApiResponse;

    return {
      accessToken: data.token,
      idToken: null,
      user: {
        id: data.user.id.toString(),
        name: data.user.username,
        roles: [data.user.role],
      },
    };
  } catch {
    return thunkApi.rejectWithValue("Не удалось подключиться к серверу");
  }
});

export const registerWithCredentials = createAsyncThunk<
  { accessToken: string; idToken: null; user: AuthUser },
  LoginCredentials,
  { rejectValue: string }
>("auth/registerWithCredentials", async (credentials, thunkApi) => {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
        role: "user",
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      return thunkApi.rejectWithValue(errorData.error || "Ошибка при регистрации");
    }

    const data = (await response.json()) as AuthApiResponse;

    return {
      accessToken: data.token,
      idToken: null,
      user: {
        id: data.user.id.toString(),
        name: data.user.username,
        roles: [data.user.role],
      },
    };
  } catch {
    return thunkApi.rejectWithValue("Не удалось подключиться к серверу");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
      state.status = "idle";
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.idToken = null;
      state.status = "idle";
      state.error = null;
    },
    setAuthFromMockUser: (state, action: PayloadAction<MockAuthPayload>) => {
      state.isAuthenticated = true;
      state.user = {
        id: `mock-${action.payload.name}`,
        name: action.payload.name,
        roles: action.payload.roles,
      };
      state.accessToken = "mock-token";
      state.idToken = null;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(completePkceLogin.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(completePkceLogin.fulfilled, (state, action) => {
        state.status = "idle";
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.idToken = action.payload.idToken;
        state.error = null;
      })
      .addCase(completePkceLogin.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Ошибка авторизации через PKCE.";
      })
      .addCase(loginWithCredentials.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginWithCredentials.fulfilled, (state, action) => {
        state.status = "idle";
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.idToken = action.payload.idToken;
        state.error = null;
      })
      .addCase(loginWithCredentials.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Ошибка авторизации.";
      })
      .addCase(registerWithCredentials.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerWithCredentials.fulfilled, (state, action) => {
        state.status = "idle";
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.idToken = action.payload.idToken;
        state.error = null;
      })
      .addCase(registerWithCredentials.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Ошибка регистрации.";
      });
  },
});

export function saveAuthState(state: AuthState) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
}

export function getOAuthConfig() {
  return OAUTH_CONFIG
}

export const { logout, clearAuthError, setAuthFromMockUser } = authSlice.actions
export default authSlice.reducer
