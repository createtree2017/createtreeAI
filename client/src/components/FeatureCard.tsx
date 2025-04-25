import { Link } from "wouter";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  href: string;
}

export default function FeatureCard({
  title,
  description,
  icon: Icon,
  bgColor,
  textColor,
  href,
}: FeatureCardProps) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-xl p-4 shadow-soft hover:shadow transition-shadow duration-300 border border-neutral-light cursor-pointer">
        <div className={`${bgColor} ${textColor} rounded-lg p-3 w-12 h-12 flex items-center justify-center mb-3`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-heading font-semibold mb-1">{title}</h3>
        <p className="text-sm text-neutral-dark">{description}</p>
      </div>
    </Link>
  );
}
