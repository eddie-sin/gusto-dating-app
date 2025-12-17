(function(){
  async function injectNavbar(){
    try{
      const res = await fetch('/partials/navbar.html', { cache: 'no-cache' });
      if(!res.ok) throw new Error('Failed to load navbar partial');
      const html = await res.text();
      document.body.insertAdjacentHTML('afterbegin', html);
      document.documentElement.classList.add('has-global-nav');

      const burger = document.querySelector('.gda-burger');
      const links = document.getElementById('gda-links');
      if(burger && links){
        burger.addEventListener('click', ()=>{
          links.classList.toggle('show');
          burger.setAttribute('aria-expanded', links.classList.contains('show') ? 'true' : 'false');
        });
      }

      // Active link highlighting
      const path = location.pathname.replace(/\/index\.html$/, '/');
      document.querySelectorAll('.gda-link').forEach(a=>{
        const href = a.getAttribute('href') || '';
        const normalized = href.replace(/\/index\.html$/, '/');
        if(path === normalized || (normalized !== '/' && path.startsWith(normalized))){
          a.classList.add('gda-link--active');
        }
      });

      // If the user has uploaded photos in this session, prefer the first photo as avatar
      try {
        const photos = JSON.parse(localStorage.getItem('photos') || '[]');
        const avatar = document.querySelector('.gda-avatar');
        if (avatar && Array.isArray(photos) && photos.length > 0 && photos[0]) {
          avatar.src = photos[0];
        }
      } catch (e) {
        // ignore
      }
    }catch(err){
      console.warn('[navbar] injection failed:', err);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', injectNavbar);
  }else{
    injectNavbar();
  }
})();
