import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';

class DateSelectorBar extends StatelessWidget {
  final String date;
  final Function(String) onDateChanged;

  const DateSelectorBar({super.key, required this.date, required this.onDateChanged});

  @override
  Widget build(BuildContext context) {
    final dt = DateTime.parse(date);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(LucideIcons.chevronLeft, color: AppColors.textMain),
            onPressed: () {
              final newDate = dt.subtract(const Duration(days: 1));
              onDateChanged(DateFormat('yyyy-MM-dd').format(newDate));
            },
          ),
          InkWell(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: dt,
                firstDate: DateTime(2024),
                lastDate: DateTime(2030),
              );
              if (picked != null) onDateChanged(DateFormat('yyyy-MM-dd').format(picked));
            },
            child: Row(
              children: [
                const Icon(LucideIcons.calendar, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  DateFormat('EEEE, MMM dd').format(dt).toUpperCase(),
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 1),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(LucideIcons.chevronRight, color: AppColors.textMain),
            onPressed: () {
              final newDate = dt.add(const Duration(days: 1));
              onDateChanged(DateFormat('yyyy-MM-dd').format(newDate));
            },
          ),
        ],
      ),
    );
  }
}
