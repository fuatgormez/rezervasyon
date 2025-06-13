import { useEffect, useState } from "react";

interface CurrentTimeLineProps {
  gridRef: React.RefObject<HTMLDivElement>;
}

export default function CurrentTimeLine({ gridRef }: CurrentTimeLineProps) {
  const [leftPx, setLeftPx] = useState(0);

  useEffect(() => {
    const updateLine = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      let left = 0;

      if (gridRef.current) {
        const grid = gridRef.current;
        const firstButton = grid.querySelector("button");
        if (firstButton) {
          const buttonWidth = (firstButton as HTMLElement).offsetWidth;
          // grid'in gap'ini al
          const style = window.getComputedStyle(grid);
          const gap = parseInt(style.columnGap || "0", 10);
          // left pozisyonunu hesapla
          left =
            hour * (buttonWidth + gap) + (minute / 60) * (buttonWidth + gap);
        }
      }
      setLeftPx(left);
    };

    updateLine();
    const interval = setInterval(updateLine, 60000);
    window.addEventListener("resize", updateLine);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateLine);
    };
  }, [gridRef]);

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
      style={{ left: leftPx }}
    >
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
    </div>
  );
}
