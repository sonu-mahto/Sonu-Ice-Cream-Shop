import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/database_provider.dart';
import '../../models/ice_cream_models.dart';
import '../../widgets/glass_card.dart';
import '../../theme/app_theme.dart';
import 'package:lucide_icons/lucide_icons.dart';

class ReturnsTab extends StatefulWidget {
  final String selectedDate;
  final String? salesmanId;

  const ReturnsTab({super.key, required this.selectedDate, this.salesmanId});

  @override
  State<ReturnsTab> createState() => _ReturnsTabState();
}

class _ReturnsTabState extends State<ReturnsTab> {
  String? _selectedSalesmanId;

  @override
  void initState() {
    super.initState();
    _selectedSalesmanId = widget.salesmanId;
  }

  void _updateReturns(DispatchRecord d, String val) {
    int? returned = int.tryParse(val);
    if (returned == null) return;
    if (returned > d.givenQuantity) {
       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Returns cannot exceed given quantity!')));
       return;
    }

    final db = context.read<DatabaseProvider>();
    final sold = d.givenQuantity - returned;
    final amount = sold * d.priceSnapshot;

    final updated = DispatchRecord(
      id: d.id,
      date: d.date,
      salesmanId: d.salesmanId,
      salesmanNameSnapshot: d.salesmanNameSnapshot,
      productId: d.productId,
      productNameSnapshot: d.productNameSnapshot,
      givenQuantity: d.givenQuantity,
      returnedQuantity: returned,
      soldQuantity: sold,
      priceSnapshot: d.priceSnapshot,
      amount: amount,
      dispatchRound: d.dispatchRound,
    );

    db.updateDispatch(updated);
  }

  @override
  Widget build(BuildContext context) {
    final db = context.watch<DatabaseProvider>();
    final activeSalesmen = db.salesmen.where((s) => s.isActive).toList();
    
    final currentDispatches = db.dispatches
        .where((d) => d.date == widget.selectedDate && d.salesmanId == _selectedSalesmanId)
        .toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('RECORD RETURNS', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2, color: AppColors.textSecondary, fontSize: 12)),
            const SizedBox(height: 12),
            
            _buildDropdown<String>(
              value: _selectedSalesmanId,
              label: 'Select Salesman',
              icon: LucideIcons.user,
              items: activeSalesmen.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
              onChanged: (val) => setState(() => _selectedSalesmanId = val),
            ),
            
            if (currentDispatches.isNotEmpty) ...[
              const SizedBox(height: 32),
              ...currentDispatches.map((d) => _buildReturnItem(d)).toList(),
            ] else if (_selectedSalesmanId != null) ...[
              const SizedBox(height: 60),
              const Center(child: Column(
                children: [
                  Icon(LucideIcons.clipboardList, size: 48, color: AppColors.textSecondary),
                  SizedBox(height: 16),
                  Text('No dispatches found for this salesman on this date.', style: TextStyle(color: AppColors.textSecondary), textAlign: TextAlign.center),
                ],
              )),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDropdown<T>({required T? value, required String label, required IconData icon, required List<DropdownMenuItem<T>> items, required ValueChanged<T?> onChanged}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.5), borderRadius: BorderRadius.circular(12)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          hint: Row(children: [Icon(icon, size: 20, color: AppColors.textSecondary), const SizedBox(width: 12), Text(label, style: TextStyle(color: AppColors.textSecondary, fontSize: 14))]),
          isExpanded: true,
          items: items,
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildReturnItem(DispatchRecord d) {
    final controller = TextEditingController(text: d.returnedQuantity?.toString() ?? '');
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(d.productNameSnapshot, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text("Given: ${d.givenQuantity} | Round ${d.dispatchRound}", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  ],
                ),
                const Spacer(),
                if (d.returnedQuantity != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                    child: Text("Sold: ${d.soldQuantity}", style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Text('RETURNED:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textSecondary)),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    height: 40,
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.5), borderRadius: BorderRadius.circular(8)),
                    child: TextField(
                      controller: controller,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      decoration: const InputDecoration(border: InputBorder.none, hintText: '0'),
                      onChanged: (val) => _updateReturns(d, val),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                const Text('pcs', style: TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
