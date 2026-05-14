import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/database_provider.dart';
import '../../models/ice_cream_models.dart';
import '../../widgets/glass_card.dart';
import '../../theme/app_theme.dart';
import 'package:lucide_icons/lucide_icons.dart';

class SettleTab extends StatefulWidget {
  final String selectedDate;
  final String? salesmanId;

  const SettleTab({super.key, required this.selectedDate, this.salesmanId});

  @override
  State<SettleTab> createState() => _SettleTabState();
}

class _SettleTabState extends State<SettleTab> {
  String? _selectedSalesmanId;
  double _commissionPercent = 40.0;
  final _paidAmtController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedSalesmanId = widget.salesmanId;
  }

  void _handleSettle() {
    if (_selectedSalesmanId == null) return;
    final db = context.read<DatabaseProvider>();
    
    // Calculate values
    final dispatches = db.dispatches.where((d) => d.date == widget.selectedDate && d.salesmanId == _selectedSalesmanId).toList();
    double totalSales = dispatches.fold(0.0, (sum, d) => sum + (d.amount));
    double commAmt = (totalSales * _commissionPercent) / 100;
    double netAmt = totalSales - commAmt;
    
    final salesman = db.salesmen.firstWhere((s) => s.id == _selectedSalesmanId);
    
    final settlement = Settlement(
      id: "${widget.selectedDate}_$_selectedSalesmanId",
      date: widget.selectedDate,
      salesmanId: _selectedSalesmanId!,
      salesmanNameSnapshot: salesman.name,
      totalAmount: totalSales,
      commissionPercent: _commissionPercent,
      commissionAmount: commAmt,
      netAmount: netAmt,
      settlementLocked: true,
      createdAt: DateTime.now().millisecondsSinceEpoch,
    );

    db.addSettlement(settlement);
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Settlement Locked!')));
  }

  void _handleRecordPayment() {
    if (_selectedSalesmanId == null || _paidAmtController.text.isEmpty) return;
    final amt = double.tryParse(_paidAmtController.text) ?? 0;
    if (amt <= 0) return;

    final db = context.read<DatabaseProvider>();
    final payment = PaymentRecord(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      date: widget.selectedDate,
      salesmanId: _selectedSalesmanId!,
      amountPaid: amt,
      note: 'Settlement Payment',
      createdAt: DateTime.now().millisecondsSinceEpoch,
    );

    db.addPayment(payment);
    _paidAmtController.clear();
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment Recorded!')));
  }

  @override
  Widget build(BuildContext context) {
    final db = context.watch<DatabaseProvider>();
    
    final uniqueSalesmenInDispatch = db.dispatches
        .where((d) => d.date == widget.selectedDate)
        .map((d) => d.salesmanId)
        .toSet()
        .toList();

    final activeSalesmen = db.salesmen.where((s) => uniqueSalesmenInDispatch.contains(s.id)).toList();
    
    final dispatches = db.dispatches.where((d) => d.date == widget.selectedDate && d.salesmanId == _selectedSalesmanId).toList();
    final isLocked = db.settlements.any((s) => s.date == widget.selectedDate && s.salesmanId == _selectedSalesmanId && s.settlementLocked);
    
    double totalSales = dispatches.fold(0.0, (sum, d) => sum + (d.amount));
    double commAmt = (totalSales * _commissionPercent) / 100;
    double netAmt = totalSales - commAmt;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('FINALIZE SETTLEMENT', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2, color: AppColors.textSecondary, fontSize: 12)),
            const SizedBox(height: 12),
            
            _buildDropdown<String>(
              value: _selectedSalesmanId,
              label: 'Select Salesman',
              icon: LucideIcons.user,
              items: activeSalesmen.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
              onChanged: (val) {
                setState(() => _selectedSalesmanId = val);
                // Load existing commission if any
                final existing = db.settlements.where((s) => s.date == widget.selectedDate && s.salesmanId == val).firstOrNull;
                if (existing != null) setState(() => _commissionPercent = existing.commissionPercent);
              },
            ),
            
            if (_selectedSalesmanId != null) ...[
              const SizedBox(height: 24),
              if (isLocked) 
                _buildLockedBanner()
              else
                _buildSettlementCalculator(totalSales, commAmt, netAmt),
                
              const SizedBox(height: 24),
              const Text('PAYMENT RECORD', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2, color: AppColors.textSecondary, fontSize: 12)),
              const SizedBox(height: 12),
              _buildPaymentSection(),
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

  Widget _buildSettlementCalculator(double sales, double comm, double net) {
    return GlassCard(
      child: Column(
        children: [
          _buildSummaryRow('Sales Amount', '₹${sales.toStringAsFixed(2)}'),
          const SizedBox(height: 16),
          Row(
            children: [
              const Text('Commission %', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
              const Spacer(),
              SizedBox(
                width: 60,
                child: TextField(
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.right,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                  decoration: const InputDecoration(border: InputBorder.none, hintText: '40'),
                  onChanged: (val) => setState(() => _commissionPercent = double.tryParse(val) ?? 40.0),
                  controller: TextEditingController(text: _commissionPercent.toStringAsFixed(0))..selection = TextSelection.fromPosition(TextPosition(offset: _commissionPercent.toStringAsFixed(0).length)),
                ),
              ),
            ],
          ),
          _buildSummaryRow('Comm. Amount', '- ₹${comm.toStringAsFixed(2)}', valueColor: Colors.redAccent),
          const Divider(height: 32),
          _buildSummaryRow('Daily Net', '₹${net.toStringAsFixed(2)}', valueSize: 20, valueColor: Colors.green, isBold: true),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _handleSettle,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.textMain, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: const Text('LOCK SETTLEMENT', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {double valueSize = 14, Color? valueColor, bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 14)),
        Text(value, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.w900, fontSize: valueSize, color: valueColor ?? AppColors.textMain)),
      ],
    );
  }

  Widget _buildPaymentSection() {
    return GlassCard(
      child: Row(
        children: [
           Expanded(
            child: TextField(
              controller: _paidAmtController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(border: InputBorder.none, hintText: 'Enter Cash Received', hintStyle: TextStyle(fontSize: 14)),
            ),
          ),
          ElevatedButton(
            onPressed: _handleRecordPayment,
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
            child: const Text('RECORD'),
          ),
        ],
      ),
    );
  }
}
