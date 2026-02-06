export const REQUEST_STATUS = {
  WAITING: "waiting",
  SCHEDULED: "scheduled",
  REJECTED: "rejected",
} as const;

export const REQUEST_STATUS_VALUES = [
  REQUEST_STATUS.WAITING,
  REQUEST_STATUS.SCHEDULED,
  REQUEST_STATUS.REJECTED,
] as const;

export type RequestStatus = (typeof REQUEST_STATUS_VALUES)[number];

export function isRequestStatus(value: string): value is RequestStatus {
  return REQUEST_STATUS_VALUES.includes(value as RequestStatus);
}
