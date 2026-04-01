document.addEventListener("DOMContentLoaded", () => {
    const links = [...document.querySelectorAll(".instructions-menu__link")];
    const sections = links
        .map(link => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    const setActiveLink = (id) => {
        links.forEach(link => {
            link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
        });
    };

    const observer = new IntersectionObserver((entries) => {
        const visible = entries
            .filter(entry => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
            setActiveLink(visible[0].target.id);
        }
    }, {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0.15, 0.3, 0.6]
    });

    sections.forEach(section => observer.observe(section));

    links.forEach(link => {
        link.addEventListener("click", () => {
            const targetId = link.getAttribute("href").replace("#", "");
            setActiveLink(targetId);
        });
    });
});