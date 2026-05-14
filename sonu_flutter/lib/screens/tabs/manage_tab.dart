import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/database_provider.dart';
import '../../models/ice_cream_models.dart';
import '../../widgets/glass_card.dart';
import '../../theme/app_theme.dart';
import 'package:lucide_icons/lucide_icons.dart';

class ManageTab extends StatefulWidget {
  const ManageTab({super.key});

  @override
  State<ManageTab> createState() => _ManageTabState();
}

class _ManageTabState extends State<ManageTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MANAGEMENT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, letterSpacing: 2)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: 'PRODUCTS'),
            Tab(text: 'SALESMEN'),
          ],
        ),
      ),
      backgroundColor: Colors.transparent,
      body: TabBarView(
        controller: _tabController,
        children: [
          _ProductManager(),
          _SalesmanManager(),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.textMain,
        onPressed: () => _showAddDialog(),
        child: const Icon(LucideIcons.plus, color: Colors.white),
      ),
    );
  }

  void _showAddDialog() {
    if (_tabController.index == 0) {
      _showAddProduct();
    } else {
      _showAddSalesman();
    }
  }

  void _showAddProduct() {
    final nameCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Ice Cream'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Product Name')),
            TextField(controller: priceCtrl, decoration: const InputDecoration(labelText: 'Price'), keyboardType: TextInputType.number),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(onPressed: () {
            if (nameCtrl.text.isEmpty || priceCtrl.text.isEmpty) return;
            context.read<DatabaseProvider>().addProduct(Product(
              id: DateTime.now().millisecondsSinceEpoch.toString(),
              name: nameCtrl.text,
              currentPrice: double.parse(priceCtrl.text),
              isActive: true,
              createdAt: DateTime.now().millisecondsSinceEpoch,
            ));
            Navigator.pop(ctx);
          }, child: const Text('Add')),
        ],
      ),
    );
  }

  void _showAddSalesman() {
    final nameCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Salesman'),
        content: TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(onPressed: () {
            if (nameCtrl.text.isEmpty) return;
            context.read<DatabaseProvider>().addSalesman(Salesman(
              id: DateTime.now().millisecondsSinceEpoch.toString(),
              name: nameCtrl.text,
              isActive: true,
              createdAt: DateTime.now().millisecondsSinceEpoch,
            ));
            Navigator.pop(ctx);
          }, child: const Text('Add')),
        ],
      ),
    );
  }
}

class _ProductManager extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final products = context.watch<DatabaseProvider>().products;
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: products.length,
      itemBuilder: (ctx, i) => _itemCard(products[i].name, '₹${products[i].currentPrice}', LucideIcons.iceCream, () => context.read<DatabaseProvider>().deleteProduct(products[i].id)),
    );
  }
}

class _SalesmanManager extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final salesmen = context.watch<DatabaseProvider>().salesmen;
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: salesmen.length,
      itemBuilder: (ctx, i) => _itemCard(salesmen[i].name, 'Active', LucideIcons.user, () => context.read<DatabaseProvider>().deleteSalesman(salesmen[i].id)),
    );
  }
}

Widget _itemCard(String title, String subtitle, IconData icon, VoidCallback onDelete) {
  return Container(
    margin: const EdgeInsets.only(bottom: 12),
    child: GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        leading: Icon(icon, color: AppColors.primary),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        trailing: IconButton(icon: const Icon(LucideIcons.trash2, color: Colors.redAccent, size: 18), onPressed: onDelete),
      ),
    ),
  );
}
