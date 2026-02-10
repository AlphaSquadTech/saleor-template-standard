import Image from "next/image";
import { YoutubeAboutIcon } from "../../../../public/icons/youtubeAboutIcon";

const HomeYoutubeSection = () => {
  return (
    <div className='bg-[url("http://wsm-saleor-assets.s3.us-west-2.amazonaws.com/baja-kits/video/home-page-about-video.jpg")] bg-no-repeat bg-cover bg-center'>
      <div className="container mx-auto max-w-5xl py-14 flex flex-col lg:flex-row justify-between items-center px-4 gap-6">
        <div className="space-y-4">
          <Image
            src="/Logo.png"
            alt="footer-icon"
            width={264}
            height={44}
            quality={85}
            sizes="100vw"
          />
          <div className="flex items-center gap-3">
            <span className="[&>svg]:size-10 text-red-500">{YoutubeAboutIcon}</span>
            <div>
              <p className="font-primary text-base/none text-white">
                Follow Us on <span className="text-red-500">YouTube</span>
              </p>
              <span className="font-secondary text-sm text-zinc-200">
                 Click Here for more videos
              </span>
            </div>
          </div>
        </div>
        <div className="w-full max-w-md max-h-64 aspect-video">
          <iframe
            src="https://www.youtube.com/embed/h89XJzR4BR4?rel=0"
            title="Home Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default HomeYoutubeSection;
