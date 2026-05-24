import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { Href } from 'expo-router';

interface NavCardProps {
  href: Href;
  title: string;
  subtitle?: string;
}

export function NavCard({ href, title, subtitle }: NavCardProps) {
  return (
    <Link href={href} asChild>
      <Pressable className="bg-card rounded-card p-card-pad mb-card-gap border-[0.5px] border-border-subtle active:border-border-active">
        <Text className="text-primary text-subtitle font-medium">{title}</Text>
        {subtitle && <Text className="text-label text-body-sm mt-1">{subtitle}</Text>}
        <Text className="text-ambient text-body-sm mt-1">→</Text>
      </Pressable>
    </Link>
  );
}
