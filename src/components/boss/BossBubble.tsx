import React from "react";

type Props = React.HTMLAttributes<HTMLButtonElement> & {
  onClick?: () => void;
};

export default function BossBubble({ onClick, className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...rest}
      className={[
        'rounded-full shadow-lg',
        'pointer-events-auto',
        'fixed bottom-5 right-5',
        'z-[9999]',
        'p-4',
        className,
      ].join(' ')}
    >
      👑
    </button>
  );
}
