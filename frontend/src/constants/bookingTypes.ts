import { VehicleType } from './parkingSpaceData';

export interface BookingDetails {
  lotId: string;
  spaceId: string;
  floor: string;
  vehicleType: VehicleType;
  tariffPerHour: number;
  hours: number;
  /** Final amount to pay (parking + service fee) */
  total: number;
}