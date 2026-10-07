import { VehicleType } from './parkingSpaceData';

export interface BookingDetails {
  lotId: string;
  spaceId: string;
  floor: string;
  vehicleType: VehicleType;
  vehiclePlate?: string;
  vehicleModel?: string;
  tariffPerHour: number;
  hours: number;
  /** Final amount to pay (parking + service fee) */
  total: number;
  paymentMethod?: string;
}