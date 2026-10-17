import { identityAssets } from "@/data/identity";
import { getAssetUrl } from "@/utils/assets";

interface LogoLoaderProps {
  className?: string;
}

const LogoLoader = ({ className = "fixed inset-0 z-50 bg-black flex items-center justify-center" }: LogoLoaderProps) => {
  return (
    <div className={className}>
        <div className="relative">
             {/* Glow Effect */}
             <div className="absolute inset-0 bg-brand-orange/20 blur-xl rounded-full animate-pulse" />

             {/* Logo */}
             <img
                src={getAssetUrl(identityAssets.logoWhite)}
                alt="Loading..."
                className="w-36 h-16 object-contain relative z-10 animate-pulse"
            />
        </div>
    </div>
  );
};

export default LogoLoader;
