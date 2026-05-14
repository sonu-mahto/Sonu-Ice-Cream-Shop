import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/database_provider.dart';
import '../../models/ice_cream_models.dart';
import '../../widgets/glass_card.dart';
import '../../theme/app_theme.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';

class DispatchTab extends StatefulWidget {
  final String selectedDate;
  final String? salesmanId;

  const DispatchTab({super.key, required this.selectedDate, this.salesmanId});

  @override
  State<DispatchTab> createState() => _DispatchTabState();
}

class _DispatchTabState extends State<DispatchTab> {
  String? _selectedSalesmanId;
  String? _selectedProductId;
  final _qtyController = TextEditingController();
  int _dispatchRound = 1;

  @override
  void initState() {
    super.initState();
    _selectedSalesmanId = widget.salesmanId;
  }

  void _handleAddDispatch() {
    final db = context.read<DatabaseProvider>();
    if (_selectedSalesmanId == null || _selectedProductId == null || _qtyController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all fields')));
      return;
    }

    final salesman = db.salesmen.firstWhere((s) => s.id == _selectedSalesmanId);
    final product = db.products.firstWhere((p) => p.id == _selectedProductId);
    final qty = int.tryParse(_qtyController.text) ?? 0;

    if (qty <= 0) return;

    final newRecord = DispatchRecord(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      date: widget.selectedDate,
      salesmanId: salesman.id,
      salesmanNameSnapshot: salesman.name,
      productId: product.id,
      productNameSnapshot: product.name,
      givenQuantity: qty,
      soldQuantity: 0,
      priceSnapshot: product.currentPrice,
      amount: 0,
      dispatchRound: _dispatchRound,
    );

    db.addDispatch(newRecord);
    _qtyController.clear();
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Dispatch Added!')));
  }

  @override
  Widget build(BuildContext context) {
    final db = context.watch<DatabaseProvider>();
    final activeSalesmen = db.salesmen.where((s) => s.isActive).toList();
    final activeProducts = db.products.where((p) => p.isActive).toList();
    
    final isLocked = db.settlements.any((s) => s.date == widget.selectedDate && s.salesmanId == _selectedSalesmanId && s.settlementLocked);
    
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
            if (isLocked) ...[
              _buildLockedBanner(),
              const SizedBox(height: 24),
            ],
            const Text('NEW DISPATCH', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2, color: AppColors.textSecondary, fontSize: 12)),
            const SizedBox(height: 12),
            
            IgnorePointer(
              ignoring: isLocked,
              child: Opacity(
                opacity: isLocked ? 0.6 : 1.0,
                child: GlassCard(
                  child: Column(
                    children: [
                       _buildDropdown<String>(
                        value: _selectedSalesmanId,
                        label: 'Select Salesman',
                        icon: LucideIcons.user,
                        items: activeSalesmen.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name, style: const TextStyle(fontSize: 14)))).toList(),
                        onChanged: (val) => setState(() => _selectedSalesmanId = val),
                      ),
                      const SizedBox(height: 16),
                      _buildDropdown<String>(
                        value: _selectedProductId,
                        label: 'Select Product',
                        icon: LucideIcons.iceCream,
                        items: activeProducts.map((p) => DropdownMenuItem(value: p.id, child: Text("${p.name} (₹${p.currentPrice})", style: const TextStyle(fontSize: 14)))).toList(),
                        onChanged: (val) => setState(() => _selectedProductId = val),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: _buildTextField(_qtyController, 'Quantity', LucideIcons.plus, isNumber: true),
                          ),
                          const SizedBox(width: 12),
                          _buildRoundSelector(),
                        ],
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: isLocked ? null : _handleAddDispatch,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('ADD TO LIST', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            
            if (currentDispatches.isNotEmpty) ...[
              const SizedBox(height: 32),
              Text('DISPATCHED TODAY (${currentDispatches.length})', style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2, color: AppColors.textSecondary, fontSize: 12)),
              const SizedBox(height: 16),
              ...currentDispatches.map((d) => _buildRecordItem(d, db)).toList(),
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

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, {bool isNumber = false}) {
    return Container(
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.5), borderRadius: BorderRadius.circular(12)),
      child: TextField(
        controller: controller,
        keyboardType: isNumber ? TextInputType.number : TextInputType.text,
        style: const TextStyle(fontSize: 14),
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, size: 20, color: AppColors.textSecondary),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildRoundSelector() {
    return Container(
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.5), borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          _roundButton(1, 'R1'),
          _roundButton(2, 'R2'),
        ],
      ),
    );
  }

  Widget _roundButton(int round, String label) {
    bool active = _dispatchRound == round;
    return InkWell(
      onTap: () => setState(() => _dispatchRound = round),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(label, style: TextStyle(color: active ? Colors.white : AppColors.textMain, fontWeight: FontWeight.bold, fontSize: 12)),
      ),
    );
  }

  Widget _buildLockedBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.green.withOpacity(0.3))),
      child: const Row(
        children: [
          Icon(LucideIcons.checkCircle2, color: Colors.green),
          SizedBox(width: 12),
          Text('SETTLEMENT LOCKED', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildRecordItem(DispatchRecord d, DatabaseProvider db) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(d.productNameSnapshot, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textMain)),
                Text("Round ${d.dispatchRound}", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ],
            ),
            const Spacer(),
            Text("${d.givenQuantity} pcs", style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary)),
            const SizedBox(width: 16),
            IconButton(
              icon: const Icon(LucideIcons.trash2, color: Colors.redAccent, size: 20),
              onPressed: () => db.deleteDispatch(d.id),
            ),
          ],
        ),
      ),
    );
  }
}
