import { Badge } from '../ui/Badge';

interface PositionBadgeProps {
  position: string;
  muted?: boolean;
}

export function PositionBadge({ position, muted }: PositionBadgeProps) {
  return <Badge muted={muted}>{position}</Badge>;
}
