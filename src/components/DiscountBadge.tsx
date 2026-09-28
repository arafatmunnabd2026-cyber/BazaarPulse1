
export const DiscountBadge = ({ originalPrice, discountPrice }: { originalPrice: number; discountPrice: number }) => {
  if (!discountPrice || discountPrice >= originalPrice) return null;

  const discountPercent = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);

  return (
    <div className="absolute top-2 left-2 z-10 w-14 h-14 flex flex-col items-center justify-center text-white font-bold leading-none select-none">
      {/* Serrated Edge Background using CSS clip-path for stamp effect */}
      <div 
        className="absolute inset-0 bg-[#e53e3e]"
        style={{
          clipPath: 'polygon(50% 0%, 61% 0.5%, 72% 3%, 82% 7%, 89% 12%, 95% 19%, 98% 27%, 99% 36%, 100% 50%, 99% 64%, 98% 73%, 95% 81%, 89% 88%, 82% 93%, 72% 97%, 61% 99%, 50% 100%, 39% 99%, 28% 97%, 18% 93%, 11% 88%, 5% 81%, 2% 73%, 1% 64%, 0% 50%, 1% 36%, 2% 27%, 5% 19%, 11% 12%, 18% 7%, 28% 3%, 39% 0.5%)'
        }}
      />
      <div className="relative z-10 text-center">
        <div className="text-lg">{discountPercent}%</div>
        <div className="text-[10px] uppercase">OFF</div>
      </div>
    </div>
  );
};
