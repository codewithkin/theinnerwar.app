import { Loading03Icon } from "@hugeicons/core-free-icons";

import { Icon } from "@/components/icon";

export default function Loader() {
  return (
    <div className="flex h-full items-center justify-center pt-8">
      <Icon icon={Loading03Icon} size={20} className="animate-spin text-ember-glow" />
    </div>
  );
}
