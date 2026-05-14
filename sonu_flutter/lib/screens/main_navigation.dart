import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../widgets/date_selector_bar.dart';
import '../theme/app_theme.dart';
import 'tabs/dashboard_tab.dart';
import 'tabs/dispatch_tab.dart';
import 'tabs/returns_tab.dart';
import 'tabs/ledger_tab.dart';
import 'tabs/settle_tab.dart';
import 'tabs/manage_tab.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _selectedIndex = 0;
  
  String selectedDate = DateTime.now().toIso8601String().substring(0, 10);
  String? selectedSalesmanId;

  final List<String> _tabIds = [
    'dashboard',
    'dispatch',
    'returns',
    'ledger',
    'settle',
    'manage'
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  void _navigateToTab(String tabId, {String? date, String? sid}) {
    int index = _tabIds.indexOf(tabId);
    if (index != -1) {
      setState(() {
        _selectedIndex = index;
        if (date != null) selectedDate = date;
        if (sid != null) selectedSalesmanId = sid;
      });
    }
  }

  Widget _buildCurrentTab() {
    // Only build the ACTIVE tab — not all 6 at once
    switch (_selectedIndex) {
      case 0:
        return DashboardTab(onNavigate: _navigateToTab);
      case 1:
        return DispatchTab(selectedDate: selectedDate, salesmanId: selectedSalesmanId);
      case 2:
        return ReturnsTab(selectedDate: selectedDate, salesmanId: selectedSalesmanId);
      case 3:
        return const LedgerTab();
      case 4:
        return SettleTab(selectedDate: selectedDate, salesmanId: selectedSalesmanId);
      case 5:
        return const ManageTab();
      default:
        return DashboardTab(onNavigate: _navigateToTab);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          children: [
            if (_selectedIndex >= 1 && _selectedIndex <= 4)
               Padding(
                 padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                 child: DateSelectorBar(
                   date: selectedDate,
                   onDateChanged: (d) => setState(() => selectedDate = d),
                 ),
               ),
            Expanded(
              child: _buildCurrentTab(),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        elevation: 8,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textSecondary,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10),
        items: const [
          BottomNavigationBarItem(icon: Icon(LucideIcons.layoutDashboard, size: 20), label: 'HOME'),
          BottomNavigationBarItem(icon: Icon(LucideIcons.send, size: 20), label: 'DISPATCH'),
          BottomNavigationBarItem(icon: Icon(LucideIcons.rotateCcw, size: 20), label: 'RETURNS'),
          BottomNavigationBarItem(icon: Icon(LucideIcons.bookOpen, size: 20), label: 'LEDGER'),
          BottomNavigationBarItem(icon: Icon(LucideIcons.creditCard, size: 20), label: 'SETTLE'),
          BottomNavigationBarItem(icon: Icon(LucideIcons.settings, size: 20), label: 'MANAGE'),
        ],
      ),
    );
  }
}
