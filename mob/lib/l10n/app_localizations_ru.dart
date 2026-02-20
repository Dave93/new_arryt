// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class AppLocalizationsRu extends AppLocalizations {
  AppLocalizationsRu([String locale = 'ru']) : super(locale);

  @override
  String get scan => 'Сканировать';

  @override
  String get scan_brand_qr => 'Сканировать QR-код бренда';

  @override
  String get app_clients_intro_title => 'Подключитесь к сервису';

  @override
  String get app_clients_intro_description =>
      'Отсканируйте QR-код бренда, чтобы подключиться к сервису. Если у вас нет QR-кода, запросите у менеджера по доставке.';

  @override
  String get error_label => 'Ошибка';

  @override
  String get this_service_is_not_valid => 'Этот сервис не действителен';

  @override
  String get profile => 'Профиль';

  @override
  String get orders => 'Заказы';

  @override
  String get settings => 'Настройки';

  @override
  String get typed_phone_incorrect => 'Указан неверный номер телефона';

  @override
  String get phone_field_label => 'Номер телефона';

  @override
  String get send_code => 'Отправить код';

  @override
  String get sigin_in => 'Войти';

  @override
  String get otpCodeError => 'Неверный код';

  @override
  String get choose_lang => 'Выберите язык';

  @override
  String get location_is_disabled_error => 'Включите геолокацию';

  @override
  String get choose_brand => 'Выберите бренд';

  @override
  String get add => 'Добавить';

  @override
  String get order_list_empty => 'Список заказов пуст';

  @override
  String get order_tab_current => 'Текущие';

  @override
  String get you_are_not_courier => 'Вы не курьер';

  @override
  String get error_work_schedule_offline_title => 'Вы не включили режим работы';

  @override
  String get notice_torn_on_work_schedule_subtitle =>
      'Включите режим работы сверху в углу, чтобы принимать заказы';

  @override
  String get logout_btn => 'Выйти';

  @override
  String get order_card_comments => 'Комментарии';

  @override
  String get order_card_items => 'Состав заказа';

  @override
  String get customer_orders_type_comment => 'Напишите комментарий';

  @override
  String get customer_name => 'Имя';

  @override
  String get address => 'Адрес';

  @override
  String get customer_phone => 'Телефон';

  @override
  String get pre_distance_label => 'Примерное расстояние';

  @override
  String get order_total_price => 'Сумма заказа';

  @override
  String get delivery_price => 'Стоимость доставки';

  @override
  String get order_status_label => 'Статус заказа';

  @override
  String get order_tab_waiting => 'Ожидают';

  @override
  String get order_card_btn_accept => 'Принять';

  @override
  String get call_customer => 'Позвонить клиенту';

  @override
  String get must_turn_on_location => 'Включите геолокацию';

  @override
  String get permission_for_location_denied =>
      'Разрешение на геолокацию отклонено';

  @override
  String get error_getting_location => 'Ошибка получения геолокации';

  @override
  String get wallet_label => 'Кошелек';

  @override
  String get wallet_balance_label => 'Баланс';

  @override
  String get currency_label => 'сум';

  @override
  String get orderStatToday => 'Заказы на сегодня';

  @override
  String get orderStatWeek => 'Заказы на неделю';

  @override
  String get orderStatMonth => 'Заказы на месяц';

  @override
  String get orderStatYesterday => 'Заказы на вчера';

  @override
  String get successOrderLabel => 'Успешные';

  @override
  String get failedOrderLabel => 'Отказы';

  @override
  String get orderStatTotalPrice => 'Итого';

  @override
  String get orderApprovedSuccessfully => 'Заказ принят успешно';

  @override
  String get cancelOrderModalLabel => 'Отмена заказа';

  @override
  String get cancelOrderModalCause => 'Напишите причину отмены заказа';

  @override
  String get cancelOrderModalSentSMSLabel => 'Отправил смс клиенту';

  @override
  String get courierScoreLabel => 'Рейтинг';

  @override
  String get courierFuelLabel => 'Топливо';

  @override
  String get orderStatOrderPrice => 'Сумма заказов';

  @override
  String get orderStatFuelPrice => 'Сумма за топливо';

  @override
  String get orderStatBonusPrice => 'Сумма бонусов';

  @override
  String get orderStatDailyGarantPrice => 'Сумма дневного гаранта';

  @override
  String get buildOrderRouteButton => 'Построить маршрут';

  @override
  String get commentFieldLabel => 'Оставить комментарий';

  @override
  String get chooseImageFromGallery => 'Выбрать фото из галереи';

  @override
  String get chooseImageFromCamery => 'Снять фото на камеру';

  @override
  String get imageAttachmentCancelText => 'Отменить';

  @override
  String get setCancelReasonLabel => 'Укажите причину отмены заказа';

  @override
  String get settingsCallCenterChatLabel => 'Написать в колл-центр';

  @override
  String get noRoleSet => 'Роль не установлена';

  @override
  String get courierBalanceTabLabel => 'Баланс курьеров';

  @override
  String get couriersListTabLabel => 'Курьеры';

  @override
  String get chooseCourierForWithdraw => 'Выберите курьера для выдачи денег';

  @override
  String get currentBalanceLabel => 'Текущий баланс';

  @override
  String get typeWithdrawAmount => 'Введите сумму для выдачи';

  @override
  String get withdrawButtonLabel => 'Выдать';

  @override
  String get ordersHistory => 'История\nзаказов';

  @override
  String get noOrders => 'Нет заказов';

  @override
  String get courierName => 'Имя курьера';

  @override
  String get ordersManagement => 'Управление\nзаказами';

  @override
  String get order_card_change_courier => 'Сменить курьера';

  @override
  String get order_card_assign_courier => 'Назначить курьера';

  @override
  String get order_card_send_yandex => 'Заказать Яндекс.Доставку';

  @override
  String get chooseCourierLabel => 'Выберите курьера';

  @override
  String get locationDialogLabel => 'Разрешение на геолокацию';

  @override
  String get locationDialogText =>
      'Чтобы отслеживать вашу физическую активность в рамках заказов, приложение Arryt собирает данные о местоположении, даже когда приложение закрыто или не используется';

  @override
  String get locationDialogApprove => 'Разрешить';

  @override
  String get privacyPolicy => 'Политика конфиденциальности';

  @override
  String get payment_type => 'Тип оплаты';

  @override
  String get call_the_call_center => 'Позвонить в колл-центр';

  @override
  String get refresh => 'Обновить';

  @override
  String get changeNumber => 'Изменить номер';

  @override
  String get orderListPhoneFieldLabel => 'Телефон клиента';

  @override
  String get callUs => 'Позвонить нам';

  @override
  String get myGarantMenuLabel => 'Мой\nГарант';

  @override
  String get garantNoData => 'Нет данных';

  @override
  String get garantOrdersCount => 'Количество заказов';

  @override
  String get garantOrdersSum => 'Сумма заказов';

  @override
  String get garantEarned => 'Заработано';

  @override
  String get garantDayOffs => 'Выходные';

  @override
  String get garantSum => 'Сумма гаранта';

  @override
  String get orderDate => 'Дата заказа';

  @override
  String get withdrawHistory => 'История выдач';

  @override
  String get workedDaysCount => 'Количество рабочих дней';

  @override
  String get notificationsLabel => 'Уведомления';

  @override
  String get noNotificationsLabel => 'Нет уведомлений';

  @override
  String get readLabel => 'Отметить прочитанным';

  @override
  String get readAlreadyLabel => 'Прочитано';

  @override
  String get requiredSettings => 'Обязательные настройки';

  @override
  String get requiredSettingsInstruction =>
      'Для корректной работы приложения необходимо выключить контроль активности и разрешить гелокацию отслеживать всегда';

  @override
  String get disableBatteryOptimization => 'Отключить контроль активности';

  @override
  String get turnOff => 'Выключить';

  @override
  String get continueText => 'Продолжить';

  @override
  String get enablLocationPermissionAlways =>
      'Разрешить геолокацию отслеживать всегда';

  @override
  String get allow => 'Разрешить';

  @override
  String get no_comments => 'Нет комментариев';

  @override
  String get yandex_pincode => 'Яндекс пин-код';

  @override
  String get get_from_cachier => 'Получить у кассира';

  @override
  String get get_from_customer => 'Получить у клиента';

  @override
  String get additional_phone_label => 'Дополнительный номер';

  @override
  String get house_label => 'Дом';

  @override
  String get entrance_label => 'Подъезд';

  @override
  String get flat_label => 'Квартира';

  @override
  String get rating_label => 'Рейтинг';

  @override
  String get deliveries_label => 'Доставки';

  @override
  String get avg_time_label => 'Ср. время';

  @override
  String get position_label => 'Позиция';

  @override
  String get total_active_couriers_label => 'Всего активных курьеров';
}
