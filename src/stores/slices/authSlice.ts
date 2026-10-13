import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserInfo } from '../../shared/types/bookkeep';
import { mmkvStorage } from '../../shared/storage/mmkvStorage';

interface AuthState {
  currentUser: UserInfo | null;
  authModalVisible: boolean;
}

const initialState: AuthState = {
  currentUser: mmkvStorage.getUser(),
  authModalVisible: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserInfo | null>) => {
      state.currentUser = action.payload;
      mmkvStorage.setUser(action.payload);
    },
    logout: state => {
      state.currentUser = null;
      mmkvStorage.setUser(null);
    },
    setAuthModalVisible: (state, action: PayloadAction<boolean>) => {
      state.authModalVisible = action.payload;
    },
  },
});

export const { setUser, logout, setAuthModalVisible } = authSlice.actions;

export default authSlice.reducer;
