import { WishList } from './wishItem';

export type Names = Record<string, string[]>;
export type Taken = Record<string, string>;
export type Gifts = Record<string, string>;
export type Passwords = Record<string, string>;

export interface NamePickerData {
  step?: 'setup' | 'selection' | 'wishes' | 'all-wishes';
  names: Names;
  taken: Taken;
  gifts?: Gifts;
  passwords?: Passwords;
  wishLists?: Record<string, WishList>;
  forbidden?: Record<string, string[]>;
  wishes?: Record<string, any[]>;
}

export interface AppState {
  currentUser: string | null;
  selectedName: string | null;
  currentStep: 'loading' | 'login' | 'selection' | 'wishes' | 'all-wishes';
  data: NamePickerData | null;
  loading: boolean;
  error: string | null;
}
