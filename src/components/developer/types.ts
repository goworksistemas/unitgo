import type { User, UserRole, Unit, Category, Item } from '@/types';

export interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  primaryUnitId: string;
  additionalUnitIds: string[];
  warehouseType: 'storage' | 'delivery' | undefined;
  adminType: 'units' | 'warehouse' | undefined;
  jobTitle: string;
  groupIds: string[];
  extraTabs: string[];
}

export interface ItemFormState {
  name: string;
  categoryId: string;
  description: string;
  unitOfMeasure: string;
  isConsumable: boolean;
  requiresResponsibilityTerm: boolean;
  defaultLoanDays: number;
  defaultMinimumQuantity: number;
  serialNumber: string;
  imageUrl: string;
  isUniqueProduct: boolean;
}

export interface UnitFormState {
  name: string;
  address: string;
  status: 'active' | 'inactive';
  floors: string[];
}

export interface DeveloperState {
  users: User[];
  units: Unit[];
  categories: Category[];
  items: Item[];
  currentUser: User | null | undefined;

  viewAsRole: UserRole | null;
  setViewAsRole: (role: UserRole | null) => void;

  isAddUserDialogOpen: boolean;
  setIsAddUserDialogOpen: (v: boolean) => void;
  isEditUserDialogOpen: boolean;
  setIsEditUserDialogOpen: (v: boolean) => void;
  isResetPasswordDialogOpen: boolean;
  setIsResetPasswordDialogOpen: (v: boolean) => void;
  isAddItemDialogOpen: boolean;
  setIsAddItemDialogOpen: (v: boolean) => void;
  isEditItemDialogOpen: boolean;
  setIsEditItemDialogOpen: (v: boolean) => void;
  isAddUnitDialogOpen: boolean;
  setIsAddUnitDialogOpen: (v: boolean) => void;
  isEditUnitDialogOpen: boolean;
  setIsEditUnitDialogOpen: (v: boolean) => void;

  selectedUser: User | null;
  setSelectedUser: (u: User | null) => void;
  selectedItem: any | null;
  selectedUnit: Unit | null;

  isUploadingImage: boolean;

  userForm: UserFormState;
  setUserForm: (f: UserFormState) => void;
  itemForm: ItemFormState;
  setItemForm: (f: ItemFormState) => void;
  unitForm: UnitFormState;
  setUnitForm: (f: UnitFormState) => void;

  handleAddUser: () => Promise<void>;
  handleEditUser: (user: User) => void;
  handleUpdateUser: () => Promise<void>;
  handleDeleteUser: (userId: string) => void;
  handleRequestPasswordChange: (user: User) => void;

  handleAddItem: () => void;
  handleEditItem: (item: any) => void;
  handleUpdateItem: () => void;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;

  handleAddUnit: () => Promise<void>;
  handleEditUnit: (unit: Unit) => void;
  handleUpdateUnit: () => Promise<void>;
  handleDeleteUnit: (unitId: string) => void;

  handleInitSchema: () => Promise<void>;
  getWarehouseUnitId: () => string | undefined;
}
