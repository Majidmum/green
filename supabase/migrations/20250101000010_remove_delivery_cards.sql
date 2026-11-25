-- Раздел «Доставка» убран с сайта: удаляем карточки сервисов, которые вели на /delivery
delete from public.home_services where link_url = '/delivery';
