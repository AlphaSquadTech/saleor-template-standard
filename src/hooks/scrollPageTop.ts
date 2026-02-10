export const handleScrollToTop = () => {
  const scrollPosition = window.scrollY || document.documentElement.scrollTop;
  if (scrollPosition > 700) {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
};
