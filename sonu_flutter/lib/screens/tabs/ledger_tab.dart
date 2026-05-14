import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/database_provider.dart';
import '../../models/ice_cream_models.dart';
import '../../widgets/glass_card.dart';
import '../../theme/app_theme.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';

class LedgerTab extends StatefulWidget {
  const LedgerTab({super.key});

  @override
  State<LedgerTab> createState() => _LedgerTabState();
}

class _LedgerTabState extends State<LedgerTab> {
  DateTime _fromDate = DateTime.now().subtract(const Duration(days: 7));
  DateTime _toDate = DateTime.now();
  String? _selectedSalesmanId;

  @override
  Widget build(BuildContext context) {
    final db = context.watch<DatabaseProvider>();
    
    final filteredSettlements = db.settlements.where((s) {
      final date = DateTime.parse(s.date);
      bool inRange = (date.isAtSameMomentAs(_fromDate) || date.isAfter(_fromDate)) &&
                     (date.isAtSameMomentAs(_toDate) || date.isBefore(_toDate));
      bool salesmanMatch = _selectedSalesmanId == null || s.salesmanId == _selectedSalesmanId;
      return inRange && salesmanMatch;
    }).toList();

    double totalSales = filteredSettlements.fold(0.0, (sum, s) => sum + s.totalAmount);
    double totalComm = filteredSettlements.fold(0.0, (sum, s) => sum + s.commissionAmount);
    double netProfit = filteredSettlements.fold(0.0, (sum, s) => sum + s.netAmount);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('FINANCIAL REPORTS', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2, color: AppColors.textSecondary, fontSize: 12)),
            const SizedBox(height: 12),
            
            _buildFilters(db.salesmen),
            const SizedBox(height: 24),
            
            _buildSummary(totalSales, totalComm, netProfit),
            const SizedBox(height: 24),
            
            if (filteredSettlements.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.only(top: 40), child: Text('No data found for this period', style: TextStyle(color: AppColors.textSecondary))))
            else
              ...filteredSettlements.map((s) => _buildSettlementCard(s, db)).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildFilters(List<Salesman> salesmen) {
    return GlassCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _datePicker('From', _fromDate, (d) => setState(() => _fromDate = d))),
              const SizedBox(width: 8),
              Expanded(child: _datePicker('To', _toDate, (d) => setState(() => _toDate = d))),
            ],
          ),
          const SizedBox(height: 12),
          _salesmanFilter(salesmen),
        ],
      ),
    );
  }

  Widget _datePicker(String label, DateTime date, Function(DateTime) onSelect) {
    return InkWell(
      onTap: () async {
        final d = await showDatePicker(context: context, initialDate: date, firstDate: DateTime(2024), lastDate: DateTime(2030));
        if (d != null) onSelect(d);
      },
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.5), borderRadius: BorderRadius.circular(10)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
            const SizedBox(height: 4),
            Text(DateFormat('dd MMM').format(date), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _salesmanFilter(List<Salesman> salesmen) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.5), borderRadius: BorderRadius.circular(10)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _selectedSalesmanId,
          hint: const Text('Filter by Salesman', style: TextStyle(fontSize: 12)),
          isExpanded: true,
          items: [
            const DropdownMenuItem(value: null, child: Text('All Salesmen', style: TextStyle(fontSize: 12))),
            ...salesmen.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name, style: const TextStyle(fontSize: 12)))),
          ],
          onChanged: (val) => setState(() => _selectedSalesmanId = val),
        ),
      ),
    );
  }

  Widget _buildSummary(double sales, double comm, double net) {
    return GlassCard(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _summaryItem('TOTAL SALES', '₹${sales.toStringAsFixed(0)}'),
              _summaryItem('COMMISSION', '₹${comm.toStringAsFixed(0)}', color: Colors.redAccent),
            ],
          ),
          const Divider(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('NET PROFIT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textSecondary)),
              Text('₹${net.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 24, color: Colors.green)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryItem(String label, String val, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
        const SizedBox(height: 4),
        Text(val, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: color ?? AppColors.textMain)),
      ],
    );
  }

  Widget _buildSettlementCard(Settlement s, DatabaseProvider db) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                const Icon(LucideIcons.user, size: 16, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(s.salesmanNameSnapshot, style: const TextStyle(fontWeight: FontWeight.bold)),
                const Spacer(),
                Text(s.date, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _miniStat('Sales', '₹${s.totalAmount.toStringAsFixed(0)}'),
                _miniStat('Comm.', '₹${s.commissionAmount.toStringAsFixed(0)}', color: Colors.redAccent),
                _miniStat('Net', '₹${s.netAmount.toStringAsFixed(0)}', color: Colors.green, isBold: true),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _miniStat(String label, String val, {Color? color, bool isBold = false}) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 8, color: AppColors.textSecondary)),
        Text(val, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.w900, fontSize: 12, color: color)),
      ],
    );
  }
}
