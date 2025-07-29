import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_ru.dart';
import 'app_localizations_uz.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('ru'),
    Locale('uz')
  ];

  /// No description provided for @scan.
  ///
  /// In en, this message translates to:
  /// **'Scan'**
  String get scan;

  /// No description provided for @scan_brand_qr.
  ///
  /// In en, this message translates to:
  /// **'Scan Brand Code'**
  String get scan_brand_qr;

  /// No description provided for @app_clients_intro_title.
  ///
  /// In en, this message translates to:
  /// **'Connect to the service'**
  String get app_clients_intro_title;

  /// No description provided for @app_clients_intro_description.
  ///
  /// In en, this message translates to:
  /// **'Scan the brand code to connect to the service. If you don\'t have a code, ask the delivery manager.'**
  String get app_clients_intro_description;

  /// No description provided for @error_label.
  ///
  /// In en, this message translates to:
  /// **'Error'**
  String get error_label;

  /// No description provided for @this_service_is_not_valid.
  ///
  /// In en, this message translates to:
  /// **'This service is not valid'**
  String get this_service_is_not_valid;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @orders.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get orders;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @typed_phone_incorrect.
  ///
  /// In en, this message translates to:
  /// **'The phone number is incorrect'**
  String get typed_phone_incorrect;

  /// No description provided for @phone_field_label.
  ///
  /// In en, this message translates to:
  /// **'Phone number'**
  String get phone_field_label;

  /// No description provided for @send_code.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get send_code;

  /// No description provided for @sigin_in.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get sigin_in;

  /// No description provided for @otpCodeError.
  ///
  /// In en, this message translates to:
  /// **'Invalid code'**
  String get otpCodeError;

  /// No description provided for @choose_lang.
  ///
  /// In en, this message translates to:
  /// **'Choose language'**
  String get choose_lang;

  /// No description provided for @location_is_disabled_error.
  ///
  /// In en, this message translates to:
  /// **'Enable location'**
  String get location_is_disabled_error;

  /// No description provided for @choose_brand.
  ///
  /// In en, this message translates to:
  /// **'Choose brand'**
  String get choose_brand;

  /// No description provided for @add.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get add;

  /// No description provided for @order_list_empty.
  ///
  /// In en, this message translates to:
  /// **'Order list is empty'**
  String get order_list_empty;

  /// No description provided for @order_tab_current.
  ///
  /// In en, this message translates to:
  /// **'Current'**
  String get order_tab_current;

  /// No description provided for @you_are_not_courier.
  ///
  /// In en, this message translates to:
  /// **'You are not courier'**
  String get you_are_not_courier;

  /// No description provided for @error_work_schedule_offline_title.
  ///
  /// In en, this message translates to:
  /// **'You did not turn on the work mode'**
  String get error_work_schedule_offline_title;

  /// No description provided for @notice_torn_on_work_schedule_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Turn on the work mode in the upper right corner to accept orders'**
  String get notice_torn_on_work_schedule_subtitle;

  /// No description provided for @logout_btn.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get logout_btn;

  /// No description provided for @order_card_comments.
  ///
  /// In en, this message translates to:
  /// **'Comments'**
  String get order_card_comments;

  /// No description provided for @order_card_items.
  ///
  /// In en, this message translates to:
  /// **'Order items'**
  String get order_card_items;

  /// No description provided for @customer_orders_type_comment.
  ///
  /// In en, this message translates to:
  /// **'Write a comment'**
  String get customer_orders_type_comment;

  /// No description provided for @customer_name.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get customer_name;

  /// No description provided for @address.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get address;

  /// No description provided for @customer_phone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get customer_phone;

  /// No description provided for @pre_distance_label.
  ///
  /// In en, this message translates to:
  /// **'Approximate distance'**
  String get pre_distance_label;

  /// No description provided for @order_total_price.
  ///
  /// In en, this message translates to:
  /// **'Total price'**
  String get order_total_price;

  /// No description provided for @delivery_price.
  ///
  /// In en, this message translates to:
  /// **'Delivery price'**
  String get delivery_price;

  /// No description provided for @order_status_label.
  ///
  /// In en, this message translates to:
  /// **'Order status'**
  String get order_status_label;

  /// No description provided for @order_tab_waiting.
  ///
  /// In en, this message translates to:
  /// **'Waiting'**
  String get order_tab_waiting;

  /// No description provided for @order_card_btn_accept.
  ///
  /// In en, this message translates to:
  /// **'Accept'**
  String get order_card_btn_accept;

  /// No description provided for @call_customer.
  ///
  /// In en, this message translates to:
  /// **'Call customer'**
  String get call_customer;

  /// No description provided for @must_turn_on_location.
  ///
  /// In en, this message translates to:
  /// **'You must turn on location'**
  String get must_turn_on_location;

  /// No description provided for @permission_for_location_denied.
  ///
  /// In en, this message translates to:
  /// **'You have not allowed location'**
  String get permission_for_location_denied;

  /// No description provided for @error_getting_location.
  ///
  /// In en, this message translates to:
  /// **'Ошибка получения геолокации'**
  String get error_getting_location;

  /// No description provided for @wallet_label.
  ///
  /// In en, this message translates to:
  /// **'Wallet'**
  String get wallet_label;

  /// No description provided for @wallet_balance_label.
  ///
  /// In en, this message translates to:
  /// **'Balance'**
  String get wallet_balance_label;

  /// No description provided for @currency_label.
  ///
  /// In en, this message translates to:
  /// **'sum'**
  String get currency_label;

  /// No description provided for @orderStatToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get orderStatToday;

  /// No description provided for @orderStatWeek.
  ///
  /// In en, this message translates to:
  /// **'Week'**
  String get orderStatWeek;

  /// No description provided for @orderStatMonth.
  ///
  /// In en, this message translates to:
  /// **'Month'**
  String get orderStatMonth;

  /// No description provided for @orderStatYesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get orderStatYesterday;

  /// No description provided for @successOrderLabel.
  ///
  /// In en, this message translates to:
  /// **'Success'**
  String get successOrderLabel;

  /// No description provided for @failedOrderLabel.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get failedOrderLabel;

  /// No description provided for @orderStatTotalPrice.
  ///
  /// In en, this message translates to:
  /// **'Total price'**
  String get orderStatTotalPrice;

  /// No description provided for @orderApprovedSuccessfully.
  ///
  /// In en, this message translates to:
  /// **'Order is approved'**
  String get orderApprovedSuccessfully;

  /// No description provided for @cancelOrderModalLabel.
  ///
  /// In en, this message translates to:
  /// **'Cancel order'**
  String get cancelOrderModalLabel;

  /// No description provided for @cancelOrderModalCause.
  ///
  /// In en, this message translates to:
  /// **'Type the cancel reason'**
  String get cancelOrderModalCause;

  /// No description provided for @cancelOrderModalSentSMSLabel.
  ///
  /// In en, this message translates to:
  /// **'Sent sms to the customer'**
  String get cancelOrderModalSentSMSLabel;

  /// No description provided for @courierScoreLabel.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get courierScoreLabel;

  /// No description provided for @courierFuelLabel.
  ///
  /// In en, this message translates to:
  /// **'Fuel'**
  String get courierFuelLabel;

  /// No description provided for @orderStatOrderPrice.
  ///
  /// In en, this message translates to:
  /// **'Order price'**
  String get orderStatOrderPrice;

  /// No description provided for @orderStatFuelPrice.
  ///
  /// In en, this message translates to:
  /// **'Fuel price'**
  String get orderStatFuelPrice;

  /// No description provided for @orderStatBonusPrice.
  ///
  /// In en, this message translates to:
  /// **'Bonus price'**
  String get orderStatBonusPrice;

  /// No description provided for @orderStatDailyGarantPrice.
  ///
  /// In en, this message translates to:
  /// **'Daily garant price'**
  String get orderStatDailyGarantPrice;

  /// No description provided for @buildOrderRouteButton.
  ///
  /// In en, this message translates to:
  /// **'Build route'**
  String get buildOrderRouteButton;

  /// No description provided for @commentFieldLabel.
  ///
  /// In en, this message translates to:
  /// **'Leave a comment'**
  String get commentFieldLabel;

  /// No description provided for @chooseImageFromGallery.
  ///
  /// In en, this message translates to:
  /// **'Choose image from gallery'**
  String get chooseImageFromGallery;

  /// No description provided for @chooseImageFromCamery.
  ///
  /// In en, this message translates to:
  /// **'Take a photo on camera'**
  String get chooseImageFromCamery;

  /// No description provided for @imageAttachmentCancelText.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get imageAttachmentCancelText;

  /// No description provided for @setCancelReasonLabel.
  ///
  /// In en, this message translates to:
  /// **'Specify the reason for the cancellation of the order'**
  String get setCancelReasonLabel;

  /// No description provided for @settingsCallCenterChatLabel.
  ///
  /// In en, this message translates to:
  /// **'Write to the call center'**
  String get settingsCallCenterChatLabel;

  /// No description provided for @noRoleSet.
  ///
  /// In en, this message translates to:
  /// **'No role set'**
  String get noRoleSet;

  /// No description provided for @courierBalanceTabLabel.
  ///
  /// In en, this message translates to:
  /// **'Couriers\' balance'**
  String get courierBalanceTabLabel;

  /// No description provided for @couriersListTabLabel.
  ///
  /// In en, this message translates to:
  /// **'Couriers'**
  String get couriersListTabLabel;

  /// No description provided for @chooseCourierForWithdraw.
  ///
  /// In en, this message translates to:
  /// **'Choose courier for withdraw'**
  String get chooseCourierForWithdraw;

  /// No description provided for @currentBalanceLabel.
  ///
  /// In en, this message translates to:
  /// **'Current balance'**
  String get currentBalanceLabel;

  /// No description provided for @typeWithdrawAmount.
  ///
  /// In en, this message translates to:
  /// **'Type withdraw amount'**
  String get typeWithdrawAmount;

  /// No description provided for @withdrawButtonLabel.
  ///
  /// In en, this message translates to:
  /// **'Withdraw'**
  String get withdrawButtonLabel;

  /// No description provided for @ordersHistory.
  ///
  /// In en, this message translates to:
  /// **'Orders\nhistory'**
  String get ordersHistory;

  /// No description provided for @noOrders.
  ///
  /// In en, this message translates to:
  /// **'No orders'**
  String get noOrders;

  /// No description provided for @courierName.
  ///
  /// In en, this message translates to:
  /// **'Courier name'**
  String get courierName;

  /// No description provided for @ordersManagement.
  ///
  /// In en, this message translates to:
  /// **'Orders\nmanagement'**
  String get ordersManagement;

  /// No description provided for @order_card_change_courier.
  ///
  /// In en, this message translates to:
  /// **'Change courier'**
  String get order_card_change_courier;

  /// No description provided for @order_card_assign_courier.
  ///
  /// In en, this message translates to:
  /// **'Assign courier'**
  String get order_card_assign_courier;

  /// No description provided for @order_card_send_yandex.
  ///
  /// In en, this message translates to:
  /// **'Order Яндекс.Delivery'**
  String get order_card_send_yandex;

  /// No description provided for @chooseCourierLabel.
  ///
  /// In en, this message translates to:
  /// **'Choose courier'**
  String get chooseCourierLabel;

  /// No description provided for @locationDialogLabel.
  ///
  /// In en, this message translates to:
  /// **'Location permissions'**
  String get locationDialogLabel;

  /// No description provided for @locationDialogText.
  ///
  /// In en, this message translates to:
  /// **'To track your physical activity as part of your orders, the Arryt app collects location data even when the app is closed or not in use'**
  String get locationDialogText;

  /// No description provided for @locationDialogApprove.
  ///
  /// In en, this message translates to:
  /// **'Allow'**
  String get locationDialogApprove;

  /// No description provided for @privacyPolicy.
  ///
  /// In en, this message translates to:
  /// **'Privacy policy'**
  String get privacyPolicy;

  /// No description provided for @payment_type.
  ///
  /// In en, this message translates to:
  /// **'Payment type'**
  String get payment_type;

  /// No description provided for @call_the_call_center.
  ///
  /// In en, this message translates to:
  /// **'Call the call center'**
  String get call_the_call_center;

  /// No description provided for @refresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get refresh;

  /// No description provided for @changeNumber.
  ///
  /// In en, this message translates to:
  /// **'Change number'**
  String get changeNumber;

  /// No description provided for @orderListPhoneFieldLabel.
  ///
  /// In en, this message translates to:
  /// **'Customer\'s phone number'**
  String get orderListPhoneFieldLabel;

  /// No description provided for @callUs.
  ///
  /// In en, this message translates to:
  /// **'Call us'**
  String get callUs;

  /// No description provided for @myGarantMenuLabel.
  ///
  /// In en, this message translates to:
  /// **'My\nguarantee'**
  String get myGarantMenuLabel;

  /// No description provided for @garantNoData.
  ///
  /// In en, this message translates to:
  /// **'No data'**
  String get garantNoData;

  /// No description provided for @garantOrdersCount.
  ///
  /// In en, this message translates to:
  /// **'Orders count'**
  String get garantOrdersCount;

  /// No description provided for @garantOrdersSum.
  ///
  /// In en, this message translates to:
  /// **'Orders sum'**
  String get garantOrdersSum;

  /// No description provided for @garantEarned.
  ///
  /// In en, this message translates to:
  /// **'Earned'**
  String get garantEarned;

  /// No description provided for @garantDayOffs.
  ///
  /// In en, this message translates to:
  /// **'Day offs'**
  String get garantDayOffs;

  /// No description provided for @garantSum.
  ///
  /// In en, this message translates to:
  /// **'Garant sum'**
  String get garantSum;

  /// No description provided for @orderDate.
  ///
  /// In en, this message translates to:
  /// **'Order date'**
  String get orderDate;

  /// No description provided for @withdrawHistory.
  ///
  /// In en, this message translates to:
  /// **'Withdraw history'**
  String get withdrawHistory;

  /// No description provided for @workedDaysCount.
  ///
  /// In en, this message translates to:
  /// **'Worked days count'**
  String get workedDaysCount;

  /// No description provided for @notificationsLabel.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationsLabel;

  /// No description provided for @noNotificationsLabel.
  ///
  /// In en, this message translates to:
  /// **'No notifications'**
  String get noNotificationsLabel;

  /// No description provided for @readLabel.
  ///
  /// In en, this message translates to:
  /// **'Read'**
  String get readLabel;

  /// No description provided for @readAlreadyLabel.
  ///
  /// In en, this message translates to:
  /// **'Read already'**
  String get readAlreadyLabel;

  /// No description provided for @requiredSettings.
  ///
  /// In en, this message translates to:
  /// **'Required settings'**
  String get requiredSettings;

  /// No description provided for @requiredSettingsInstruction.
  ///
  /// In en, this message translates to:
  /// **'For the application to work correctly, you must turn off activity control and allow geolocation to track always'**
  String get requiredSettingsInstruction;

  /// No description provided for @disableBatteryOptimization.
  ///
  /// In en, this message translates to:
  /// **'Disable battery optimization'**
  String get disableBatteryOptimization;

  /// No description provided for @turnOff.
  ///
  /// In en, this message translates to:
  /// **'Turn off'**
  String get turnOff;

  /// No description provided for @continueText.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueText;

  /// No description provided for @enablLocationPermissionAlways.
  ///
  /// In en, this message translates to:
  /// **'Enable location permission always'**
  String get enablLocationPermissionAlways;

  /// No description provided for @allow.
  ///
  /// In en, this message translates to:
  /// **'Allow'**
  String get allow;

  /// No description provided for @no_comments.
  ///
  /// In en, this message translates to:
  /// **'No comments'**
  String get no_comments;

  /// No description provided for @yandex_pincode.
  ///
  /// In en, this message translates to:
  /// **'Yandex pincode'**
  String get yandex_pincode;

  /// No description provided for @get_from_cachier.
  ///
  /// In en, this message translates to:
  /// **'Get from cashier'**
  String get get_from_cachier;

  /// No description provided for @get_from_customer.
  ///
  /// In en, this message translates to:
  /// **'Get from customer'**
  String get get_from_customer;

  /// No description provided for @additional_phone_label.
  ///
  /// In en, this message translates to:
  /// **'Additional phone number'**
  String get additional_phone_label;

  /// No description provided for @house_label.
  ///
  /// In en, this message translates to:
  /// **'House'**
  String get house_label;

  /// No description provided for @entrance_label.
  ///
  /// In en, this message translates to:
  /// **'Entrance'**
  String get entrance_label;

  /// No description provided for @flat_label.
  ///
  /// In en, this message translates to:
  /// **'Flat'**
  String get flat_label;

  /// No description provided for @rating_label.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get rating_label;

  /// No description provided for @deliveries_label.
  ///
  /// In en, this message translates to:
  /// **'Deliveries'**
  String get deliveries_label;

  /// No description provided for @avg_time_label.
  ///
  /// In en, this message translates to:
  /// **'Avg. Time'**
  String get avg_time_label;

  /// No description provided for @position_label.
  ///
  /// In en, this message translates to:
  /// **'Position'**
  String get position_label;

  /// No description provided for @total_active_couriers_label.
  ///
  /// In en, this message translates to:
  /// **'Total active couriers'**
  String get total_active_couriers_label;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'ru', 'uz'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'ru':
      return AppLocalizationsRu();
    case 'uz':
      return AppLocalizationsUz();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
