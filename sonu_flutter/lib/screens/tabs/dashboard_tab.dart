import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/database_provider.dart';
import '../../widgets/glass_card.dart';
import '../../theme/app_theme.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';

class DashboardTab extends StatelessWidget {
  final Function(String tabId, {String? date, String? sid}) onNavigate;

  const DashboardTab({super.key, required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    final db = context.watch<DatabaseProvider>();
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    
    // Stats Logic
    final todayDispatches = db.dispatches.where((d) => d.date == today).toList();
    final todaySales = todayDispatches.fold(0.0, (sum, d) => sum + d.amount);
    final todaySettled = db.settlements
        .where((s) => s.date == today)
        .fold(0.0, (sum, s) => sum + s.totalAmount);
    
    final allTimePending = _calculatePendingSettlements(db);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(db.ownerUsername ?? 'Guest'),
          const SizedBox(height: 24),
          
          // Stats Row
          Row(
            children: [
              Expanded(child: _buildStatCard('Today\'s Sales', '₹${todaySales.toStringAsFixed(0)}', LucideIcons.iceCream, Colors.orange)),
              const SizedBox(width: 16),
              Expanded(child: _buildStatCard('Settled', '₹${todaySettled.toStringAsFixed(0)}', LucideIcons.checkCircle2, Colors.green)),
            ],
          ),
          
          const SizedBox(height: 24),
          if (allTimePending.isNotEmpty) ...[
            const Text('PENDING SETTLEMENTS', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2, color: AppColors.textSecondary, fontSize: 12)),
            const SizedBox(height: 12),
            ...allTimePending.map((p) => _buildPendingItem(p, onNavigate)).toList(),
          ],
          
          // Quick Actions
          const SizedBox(height: 24),
          const Text('QUICK ACTIONS', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2, color: AppColors.textSecondary, fontSize: 12)),
          const SizedBox(height: 12),
          _buildActionCard('Add Dispatch', LucideIcons.plus, () => onNavigate('dispatch')),
          _buildActionCard('View Reports', LucideIcons.barChart3, () => onNavigate('ledger')),
        ],
      ),
    );
  }

  Widget _buildHeader(String name) {
    return Row(
      children: [
        CircleAvatar(
          backgroundColor: AppColors.primary.withOpacity(0.1),
          child: const Icon(LucideIcons.user, color: AppColors.primary),
        ),
        const SizedBox(width: 16),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Welcome,', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
            Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.textMain)),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return GlassCard(
      height: 120,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 12),
          Text(title, style: TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: AppColors.textMain)),
        ],
      ),
    );
  }

  Widget _buildPendingItem(Map<String, dynamic> item, Function(String, {String? date, String? sid}) onNavigate) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Colors.red.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
              child: const Icon(LucideIcons.clock, color: Colors.red, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item['name'], style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textMain)),
                  Text(item['date'], style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                ],
              ),
            ),
            TextButton(
              onPressed: () => onNavigate('settle', date: item['date'], sid: item['sid']),
              child: const Text('SETTLE', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionCard(String title, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        child: GlassCard(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(icon, color: AppColors.textMain, size: 20),
              const SizedBox(width: 16),
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textMain)),
              const Spacer(),
              const Icon(LucideIcons.chevronRight, color: AppColors.textSecondary, size: 18),
            ],
          ),
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _calculatePendingSettlements(DatabaseProvider db) {
    Map<String, Set<String>> combinations = {};
    for (var d in db.dispatches) {
      String key = "${d.date}|${d.salesmanId}";
      combinations[key] = (combinations[key] ?? {})..add(d.salesmanNameSnapshot);
    }

    List<Map<String, dynamic>> pending = [];
    combinations.forEach((key, names) {
      final parts = key.split('|');
      final date = parts[0];
      final sid = parts[1];
      
      bool isSettled = db.settlements.any((s) => s.date == date && s.sid == sid && s.settlementLocked);
      if (!isSettled) {
        pending.add({
          'date': date,
          'sid': sid,
          'name': names.first,
        });
      }
    });

    pending.sort((a, b) => b['date'].compareTo(a['date']));
    return pending.take(5).toList();
  }
}
// Add extension to Settlement for easier access if missing
extension SettlementExt on dynamic {
  // To handle the mapping from React to Dart properly
  String get sid => this.salesmanId;
}
