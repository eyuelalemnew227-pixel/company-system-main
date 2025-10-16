import { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    const { width = '40', height = '40', className = '', ...rest } = props;
    
    return (
        <img
            src="/images/logo.png"
            alt="logo"
            className={`w-${width} h-${height} lg:w-56 lg:h-56 object-contain ${className}`}
            {...rest}
        />
    );
}