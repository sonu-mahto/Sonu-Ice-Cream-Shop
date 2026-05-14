import 'package:flutter/material.dart';

class AppColors {
  static const Color primary = Color(0xFFD32F2F);
  static const Color accent = Color(0xFFE87A5D);
  static const Color background = Color(0xFFF5F5F5);
  static const Color textMain = Color(0xFF5D4037);
  static const Color textSecondary = Color(0xFFA1887F);
  static const Color surface = Colors.white;
  static const Color glassBorder = Colors.white;
}

class AppTheme {
  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        surface: AppColors.surface,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textMain),
        bodyLarge: TextStyle(color: AppColors.textMain),
        bodyMedium: TextStyle(color: AppColors.textMain),
      ),
      scaffoldBackgroundColor: AppColors.background,
    );
  }
}
