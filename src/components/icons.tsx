import {
  ArrowsDownUp as ArrowsDownUpIcon,
  CalendarDots as CalendarDotsIcon,
  Check as CheckIcon,
  Clock as ClockIcon,
  CurrencyDollar as CurrencyDollarIcon,
  Lock as LockIcon,
  MapPin as MapPinIcon,
  Minus as MinusIcon,
  Moon as MoonIcon,
  PencilSimple as PencilSimpleIcon,
  Plus as PlusIcon,
  Racquet as RacquetIcon,
  Rows as RowsIcon,
  ShieldCheck as ShieldCheckIcon,
  SquaresFour as SquaresFourIcon,
  Sun as SunIcon,
  Trash as TrashIcon,
  UserCircle as UserCircleIcon,
  UserPlus as UserPlusIcon,
  Users as UsersIcon,
  X as XIcon
} from "@phosphor-icons/react/dist/ssr";
import type { ComponentProps, ElementType } from "react";

type IconProps = ComponentProps<typeof ClockIcon>;

function withRegularIcon(IconComponent: ElementType<IconProps>) {
  return function WrappedIcon({ weight = "regular", ...props }: IconProps) {
    return <IconComponent weight={weight} {...props} />;
  };
}

export const ArrowUpDown = withRegularIcon(ArrowsDownUpIcon);
export const CalendarDays = withRegularIcon(CalendarDotsIcon);
export const CircleUserRound = withRegularIcon(UserCircleIcon);
export const Clock3 = withRegularIcon(ClockIcon);
export const Clock = withRegularIcon(ClockIcon);
export const DollarSign = withRegularIcon(CurrencyDollarIcon);
export const LayoutGrid = withRegularIcon(SquaresFourIcon);
export const Lock = withRegularIcon(LockIcon);
export const MapPin = withRegularIcon(MapPinIcon);
export const Minus = withRegularIcon(MinusIcon);
export const Moon = withRegularIcon(MoonIcon);
export const Pencil = withRegularIcon(PencilSimpleIcon);
export const Plus = withRegularIcon(PlusIcon);
export const Rows3 = withRegularIcon(RowsIcon);
export const ShieldCheck = withRegularIcon(ShieldCheckIcon);
export const Sparkles = withRegularIcon(RacquetIcon);
export const Sun = withRegularIcon(SunIcon);
export const Trash2 = withRegularIcon(TrashIcon);
export const UserPlus = withRegularIcon(UserPlusIcon);
export const Users2 = withRegularIcon(UsersIcon);
export const X = withRegularIcon(XIcon);
export const Check = withRegularIcon(CheckIcon);
