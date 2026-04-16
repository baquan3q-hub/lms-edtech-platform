"use client";

import dynamic from 'next/dynamic';

const DotLottieReact = dynamic(
    () => import('@lottiefiles/dotlottie-react').then(mod => mod.DotLottieReact),
    { ssr: false }
);

export default function LottieAnimation({ src, ...props }: { src: string, [key: string]: any }) {
    return <DotLottieReact src={src} {...props} />;
}
