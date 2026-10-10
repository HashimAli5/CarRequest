import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme';
import type { RequestStatus } from './types';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const STATUS_META: Record<
  RequestStatus,
  { label: string; long: string; color: string; soft: string; icon: IconName }
> = {
  PENDING: {
    label: 'Pending',
    long: 'Waiting for a decision',
    color: colors.pending,
    soft: colors.pendingSoft,
    icon: 'time',
  },
  APPROVED: {
    label: 'Approved',
    long: 'Approved',
    color: colors.success,
    soft: colors.successSoft,
    icon: 'checkmark-circle',
  },
  REJECTED: {
    label: 'Rejected',
    long: 'Rejected',
    color: colors.error,
    soft: colors.errorSoft,
    icon: 'close-circle',
  },
  ALTERNATIVE_PROPOSED: {
    label: 'Alternative Proposed',
    long: 'Another time suggested',
    color: colors.alternative,
    soft: colors.alternativeSoft,
    icon: 'swap-horizontal',
  },
  DECLINED: {
    label: 'Declined',
    long: 'Suggested time declined by requester',
    color: colors.neutral,
    soft: colors.neutralSoft,
    icon: 'remove-circle',
  },
};
