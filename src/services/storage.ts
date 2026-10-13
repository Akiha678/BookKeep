import { mmkvStorage } from '../shared/storage/mmkvStorage';

export { mmkvStorage };

export const storage = {
  getTransactions: () => mmkvStorage.getTransactions(),
  getUser: () => mmkvStorage.getUser(),
  setUser: (user: any) => mmkvStorage.setUser(user),
  getSyncConfig: () => mmkvStorage.getSyncConfig(),
  updateSyncConfig: (cfg: any) =>
    mmkvStorage.setSyncConfig({ ...mmkvStorage.getSyncConfig(), ...cfg }),
  exportDataJson: () => mmkvStorage.exportDataJson(),
  importDataJson: (json: string) => mmkvStorage.importDataJson(json),
  clearAllData: () => mmkvStorage.clearAllData(),
  getUnsyncedTransactions: () => mmkvStorage.getTransactions().filter(t => !t.synced),
};

export default storage;
