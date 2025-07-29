import 'dart:isolate';
import 'dart:ui';

import 'package:arryt/main.dart';
import 'package:auto_route/auto_route.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:arryt/bloc/block_imports.dart';
import 'package:arryt/l10n/support_locale.dart';
import 'package:arryt/provider/locale_provider.dart';
import 'package:arryt/router.dart';

import 'package:arryt/l10n/app_localizations.dart';
import 'package:month_year_picker/month_year_picker.dart';
import 'package:provider/provider.dart';

import 'widgets/home/order_accept_slider.dart';

class App extends StatelessWidget {
  const App({super.key});

  static FirebaseAnalytics analytics = FirebaseAnalytics.instance;
  static FirebaseAnalyticsObserver observer =
      FirebaseAnalyticsObserver(analytics: analytics);

  @override
  Widget build(BuildContext context) {
    return const AppView();
  }
}

class AppView extends StatefulWidget {
  const AppView({super.key});

  static const String name = 'ARRYT';
  static const Color mainColor = Color(0xFF9D50DD);

  @override
  State<AppView> createState() => _AppViewState();
}

class _AppViewState extends State<AppView> {
  static const String _isolateName = "LocatorIsolate";
  ReceivePort port = ReceivePort();
  final _rootRouter = getIt<AppRouter>();
  late BuildContext _context;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> initPlatformState() async {
    // await BackgroundLocator.initialize();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<ApiClientsBloc>(
          create: (context) => ApiClientsBloc(),
        ),
        BlocProvider<OtpPhoneNumberBloc>(
          create: (context) => OtpPhoneNumberBloc(),
        ),
        BlocProvider<OtpTokenBloc>(
          create: (context) => OtpTokenBloc(),
        ),
        BlocProvider<UserDataBloc>(create: (context) => UserDataBloc())
      ],
      child: BlocBuilder<UserDataBloc, UserDataState>(
        builder: (context, state) {
          return ChangeNotifierProvider(
              create: (context) => LocaleProvider(),
              builder: (context, child) {
                return Consumer<LocaleProvider>(
                    builder: (context, provider, child) {
                  _context = context; // Store the context here
                  return MaterialApp.router(
                      debugShowCheckedModeBanner: false,
                      localizationsDelegates: const [
                        AppLocalizations.delegate,
                        GlobalWidgetsLocalizations.delegate,
                        GlobalMaterialLocalizations.delegate,
                        MonthYearPickerLocalizations.delegate,
                        GlobalCupertinoLocalizations.delegate,
                      ],
                      supportedLocales: L10n.support,
                      locale: provider.locale,
                      theme: ThemeData(
                          colorScheme: ColorScheme.fromSeed(
                            seedColor: Colors.deepPurple,
                            brightness: Brightness.light,
                          ),
                          useMaterial3: true,
                          fontFamily: GoogleFonts.nunito().fontFamily,
                          iconTheme: const IconThemeData(color: Colors.white),
                          textTheme: TextTheme(
                            displayLarge: GoogleFonts.nunito(
                                fontSize: 97,
                                fontWeight: FontWeight.w300,
                                letterSpacing: -1.5),
                            displayMedium: GoogleFonts.nunito(
                                fontSize: 61,
                                fontWeight: FontWeight.w300,
                                letterSpacing: -0.5),
                            displaySmall: GoogleFonts.nunito(
                                fontSize: 48, fontWeight: FontWeight.w400),
                            headlineLarge: GoogleFonts.nunito(
                                fontSize: 30,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.25),
                            headlineMedium: GoogleFonts.nunito(
                                fontSize: 24, fontWeight: FontWeight.w400),
                            headlineSmall: GoogleFonts.nunito(
                                fontSize: 20,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 0.15),
                            titleLarge: GoogleFonts.nunito(
                                fontSize: 16,
                                fontWeight: FontWeight.w400,
                                letterSpacing: 0.15),
                            titleMedium: GoogleFonts.nunito(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 0.1),
                            titleSmall: GoogleFonts.nunito(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 0.1),
                            bodyLarge: GoogleFonts.nunito(
                                fontSize: 16,
                                fontWeight: FontWeight.w400,
                                letterSpacing: 0.5),
                            bodyMedium: GoogleFonts.nunito(
                                fontSize: 14,
                                fontWeight: FontWeight.w400,
                                letterSpacing: 0.25),
                            bodySmall: GoogleFonts.nunito(
                                fontSize: 12,
                                fontWeight: FontWeight.w400,
                                letterSpacing: 1.25,
                                color: Colors.white),
                            labelSmall: GoogleFonts.nunito(
                                fontSize: 12,
                                fontWeight: FontWeight.w400,
                                letterSpacing: 0.4),
                            labelLarge: GoogleFonts.nunito(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 1.5),
                          )),
                      routerDelegate: _rootRouter.delegate(
                        navigatorObservers: () => [AutoRouteObserver()],
                      ),
                      // routeInformationProvider: _rootRouter.routeInfoProvider(),
                      routeInformationParser: _rootRouter.defaultRouteParser());
                });
              });
        },
      ),
    );
  }
}
