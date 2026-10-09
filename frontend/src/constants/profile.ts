export interface StaffProfile {
  name: string;
  email: string;
  role: string;
  avatar: string;
  avatarBg: string;
  staffId: string;
  avatarImageUri?: string;
  assignedLot?: string;
}

export const defaultStaffProfile: StaffProfile = {
  name: 'Kavishka Perera',
  email: 'kavisha@parkme.com',
  role: 'Parking Staff',
  avatar: '👤',
  avatarBg: '#BAE6FD',
  staffId: 'STF-4091',
  assignedLot: 'One Galle Face Mall',
};
