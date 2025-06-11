import Slider from 'react-slick';
import { Box } from '@mui/material';

const images = [
    '/assets/carousel/image_1.png',
    '/assets/carousel/image_2.png',
    '/assets/carousel/image_4.jpg',
    '/assets/carousel/image_5.png'
];

export function Carousel() {
    const settings = {
        dots: true,               // ✅ cercles de navigation
        infinite: true,
        speed: 600,               // ✅ vitesse de transition
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: false,            // ❌ pas de flèches
        autoplay: true,
        autoplaySpeed: 4000,
        fade: true,               // ✅ transition en fondu (plus élégant)
        pauseOnHover: true,
    };

    return (
        <Box
            sx={{
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: 3,
                mb: 4,
                position: 'relative', // ← ajouté
            }}
        >
            <Slider {...settings}>
                {images.map((src, index) => (
                    <Box key={index}>
                        <img
                            src={src}
                            alt={`carousel-${index}`}
                            style={{
                                width: '100%',
                                height: 220,
                                objectFit: 'cover',
                            }}
                        />
                    </Box>
                ))}
            </Slider>
        </Box>

    );
}
