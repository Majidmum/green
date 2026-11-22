-- Фото для карточек сервисов на главной (файлы лежат в public/services/)
update public.home_services set image_url = '/services/catalog.jpg'  where link_url = '/catalog'          and image_url is null;
update public.home_services set image_url = '/services/delivery.jpg' where title = 'Доставка по Душанбе'    and image_url is null;
update public.home_services set image_url = '/services/pickup.jpg'   where title = 'Заберите сами'          and image_url is null;
update public.home_services set image_url = '/services/promo.jpg'    where link_url = '/catalog?sale=1'     and image_url is null;
update public.home_services set image_url = '/services/account.jpg'  where link_url = '/profile'            and image_url is null;
update public.home_services set image_url = '/services/about.jpg'    where link_url = '/about'              and image_url is null;
