import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/database_provider.dart';
import 'theme/app_theme.dart';
import 'screens/auth_screen.dart';
import 'screens/main_navigation.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase will be enabled later via flutterfire configure
  // For now, app works with local storage only

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => DatabaseProvider()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sonu Ice Cream Shop',
      theme: AppTheme.light,
      debugShowCheckedModeBanner: false,
      home: Consumer<DatabaseProvider>(
        builder: (context, db, _) {
          if (!db.isLoggedIn) {
            return const AuthScreen();
          }
          return const MainNavigation();
        },
      ),
    );
  }
}
