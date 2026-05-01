import {
  Trash2,
  Users,
  Link,
  BadgeIndianRupee,
  HandCoins,
  Sun,
  Moon,
  CheckCircle,
  Camera,
  Edit2,
} from "lucide-react";

export function IconTrash(props) {
  const { className = "w-4 h-4", ...rest } = props;
  return <Trash2 className={className} {...rest} />;
}

export function IconUsers(props) {
  const { className = "w-5 h-5", ...rest } = props;
  return <Users className={className} {...rest} />;
}

export function IconLink(props) {
  const { className = "w-4 h-4", ...rest } = props;
  return <Link className={className} {...rest} />;
}

export function IconSun(props) {
  const { className = "w-5 h-5", ...rest } = props;
  return <Sun className={className} {...rest} />;
}

export function IconMoon(props) {
  const { className = "w-5 h-5", ...rest } = props;
  return <Moon className={className} {...rest} />;
}

export function IconCheckCircle(props) {
  const { className = "w-5 h-5", ...rest } = props;
  return <CheckCircle className={className} {...rest} />;
}

export function IconCamera(props) {
  const { className = "w-5 h-5", ...rest } = props;
  return <Camera className={className} {...rest} />;
}

export function IconPencil(props) {
  const { className = "w-4 h-4", ...rest } = props;
  return <Edit2 className={className} {...rest} />;
}

export function IconRupeeBadge(props) {
  const { className = "w-5 h-5", ...rest } = props;
  return <BadgeIndianRupee className={className} {...rest} />;
}

export function IconHandCoins(props) {
  const { className = "w-7 h-7", ...rest } = props;
  return <HandCoins className={className} {...rest} />;
}
