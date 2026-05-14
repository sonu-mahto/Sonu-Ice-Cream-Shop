import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:crypto/crypto.dart';
import '../models/ice_cream_models.dart';

const String storageKey = 'sonu_ice_cream_db';
const String firebaseCollection = 'ice_cream_shops';

class DatabaseProvider with ChangeNotifier {
  List<Product> products = [];
  List<Salesman> salesmen = [];
  List<DispatchRecord> dispatches = [];
  List<Settlement> settlements = [];
  List<PaymentRecord> paymentLedger = [];
  
  String? ownerUsername;
  String? ownerHash;
  String? recoveryHash;
  bool isLoggedIn = false;
  bool autoSyncEnabled = true;
  DateTime? lastUpdated;

  // Lazy firestore access — only use when Firebase is actually initialized
  FirebaseFirestore? _firestoreInstance;
  FirebaseFirestore? get _firestore {
    try {
      if (Firebase.apps.isNotEmpty) {
        _firestoreInstance ??= FirebaseFirestore.instance;
        return _firestoreInstance;
      }
    } catch (_) {}
    return null;
  }

  DatabaseProvider() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _init();
    });
  }

  Future<void> _init() async {
    try {
      await loadLocalData();
      if (isLoggedIn && ownerUsername != null && _firestore != null) {
        _setupRealtimeListener();
      }
    } catch (e) {
      debugPrint("Error in DatabaseProvider._init: $e");
    }
  }

  // --- Logic & Data Handling ---

  String hashPwd(String password) {
    var bytes = utf8.encode(password + 'sonu_salt_2024');
    var digest = sha256.convert(bytes);
    return digest.toString();
  }

  Future<void> loadLocalData() async {
    final prefs = await SharedPreferences.getInstance();
    final String? data = prefs.getString(storageKey);
    
    if (data != null) {
      await Future.delayed(const Duration(milliseconds: 50));
      
      try {
        final Map<String, dynamic> json = jsonDecode(data);
        
        products = (json['products'] as List? ?? []).map((e) => Product.fromMap(e)).toList();
        salesmen = (json['salesmen'] as List? ?? []).map((e) => Salesman.fromMap(e)).toList();
        dispatches = (json['dispatches'] as List? ?? []).map((e) => DispatchRecord.fromMap(e)).toList();
        settlements = (json['settlements'] as List? ?? []).map((e) => Settlement.fromMap(e)).toList();
        paymentLedger = (json['paymentLedger'] as List? ?? []).map((e) => PaymentRecord.fromMap(e)).toList();
        
        ownerUsername = json['ownerUsername'];
        ownerHash = json['ownerHash'];
        recoveryHash = json['recoveryHash'];
        autoSyncEnabled = json['autoSyncEnabled'] ?? true;
        if (json['lastUpdated'] != null) {
          lastUpdated = DateTime.parse(json['lastUpdated']);
        }
        
        final String? sessionData = prefs.getString('sonu_session');
        if (sessionData != null) {
          final session = jsonDecode(sessionData);
          isLoggedIn = session['isLoggedIn'] ?? false;
        }
        
        notifyListeners();
      } catch (e) {
        debugPrint("Error decoding local data: $e");
      }
    }
  }

  Future<void> saveLocalData() async {
    final prefs = await SharedPreferences.getInstance();
    lastUpdated = DateTime.now();
    
    final Map<String, dynamic> data = {
      'products': products.map((e) => e.toMap()).toList(),
      'salesmen': salesmen.map((e) => e.toMap()).toList(),
      'dispatches': dispatches.map((e) => e.toMap()).toList(),
      'settlements': settlements.map((e) => e.toMap()).toList(),
      'paymentLedger': paymentLedger.map((e) => e.toMap()).toList(),
      'ownerUsername': ownerUsername,
      'ownerHash': ownerHash,
      'recoveryHash': recoveryHash,
      'autoSyncEnabled': autoSyncEnabled,
      'lastUpdated': lastUpdated?.toIso8601String(),
    };
    
    await prefs.setString(storageKey, jsonEncode(data));
    
    if (autoSyncEnabled && isLoggedIn && ownerUsername != null && _firestore != null) {
      _syncToFirebase();
    }
    
    notifyListeners();
  }

  // Cleanup logic removed to preserve user records

  // --- Firebase Sync ---

  void _setupRealtimeListener() {
    if (ownerUsername == null || _firestore == null) return;
    
    _firestore!.collection(firebaseCollection).doc('${ownerUsername}_data').snapshots().listen((docSnap) {
      if (docSnap.exists) {
        final cloudData = docSnap.data() as Map<String, dynamic>;
        final cloudTimeStr = cloudData['lastUpdated'];
        final cloudTime = cloudTimeStr != null ? DateTime.parse(cloudTimeStr) : DateTime.fromMillisecondsSinceEpoch(0);
        
        if (lastUpdated == null || cloudTime.isAfter(lastUpdated!)) {
          debugPrint("Cloud data is newer, updating local state...");
          _updateFromMap(cloudData);
        }
      }
    }, onError: (e) {
      debugPrint("Firestore listener error: $e");
    });
  }

  Future<void> _syncToFirebase() async {
    if (ownerUsername == null || _firestore == null) return;
    try {
      final docRef = _firestore!.collection(firebaseCollection).doc('${ownerUsername}_data');
      final data = {
        'products': products.map((e) => e.toMap()).toList(),
        'salesmen': salesmen.map((e) => e.toMap()).toList(),
        'dispatches': dispatches.map((e) => e.toMap()).toList(),
        'settlements': settlements.map((e) => e.toMap()).toList(),
        'paymentLedger': paymentLedger.map((e) => e.toMap()).toList(),
        'ownerUsername': ownerUsername,
        'ownerHash': ownerHash,
        'recoveryHash': recoveryHash,
        'autoSyncEnabled': autoSyncEnabled,
        'lastUpdated': lastUpdated?.toIso8601String(),
        'lastFirebaseSync': DateTime.now().millisecondsSinceEpoch,
      };
      await docRef.set(data, SetOptions(merge: true));
      debugPrint("Firebase Sync Successful");
    } catch (e) {
      debugPrint("Firebase Sync Failed: $e");
    }
  }

  void _updateFromMap(Map<String, dynamic> json) {
    products = (json['products'] as List? ?? []).map((e) => Product.fromMap(e)).toList();
    salesmen = (json['salesmen'] as List? ?? []).map((e) => Salesman.fromMap(e)).toList();
    dispatches = (json['dispatches'] as List? ?? []).map((e) => DispatchRecord.fromMap(e)).toList();
    settlements = (json['settlements'] as List? ?? []).map((e) => Settlement.fromMap(e)).toList();
    paymentLedger = (json['paymentLedger'] as List? ?? []).map((e) => PaymentRecord.fromMap(e)).toList();
    ownerHash = json['ownerHash'];
    recoveryHash = json['recoveryHash'];
    if (json['lastUpdated'] != null) {
      lastUpdated = DateTime.parse(json['lastUpdated']);
    }
    notifyListeners();
  }

  // --- Auth Methods ---

  Future<bool> login(String username, String password, {String? recoveryPhrase}) async {
    final hash = hashPwd(password);
    
    // Attempt Firebase login first (only if Firebase is available)
    if (_firestore != null) {
      try {
        final docSnap = await _firestore!.collection(firebaseCollection).doc('${username}_data').get().timeout(const Duration(seconds: 5));
        if (docSnap.exists) {
          final cloudData = docSnap.data() as Map<String, dynamic>;
          if (cloudData['ownerHash'] == hash) {
            ownerUsername = username;
            _updateFromMap(cloudData);
            await _setLoggedIn(true);
            _setupRealtimeListener();
            return true;
          }
        }
      } catch (e) {
        debugPrint("Cloud login failed, falling back to local: $e");
      }
    }

    // Local / Initial Setup
    if (ownerHash == null && recoveryPhrase != null) {
      ownerUsername = username;
      ownerHash = hash;
      recoveryHash = hashPwd(recoveryPhrase);
      await _setLoggedIn(true);
      await saveLocalData();
      return true;
    } else if (ownerUsername == username && ownerHash == hash) {
      await _setLoggedIn(true);
      if (_firestore != null) _setupRealtimeListener();
      return true;
    }
    
    return false;
  }

  Future<void> _setLoggedIn(bool value) async {
    isLoggedIn = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('sonu_session', jsonEncode({'isLoggedIn': value, 'ownerUsername': ownerUsername}));
    notifyListeners();
  }

  void logout() async {
    await _setLoggedIn(false);
  }

  // --- Data Mutators ---
  
  void addProduct(Product p) { products.add(p); saveLocalData(); }
  void deleteProduct(String id) { products.removeWhere((x) => x.id == id); saveLocalData(); }
  
  void addSalesman(Salesman s) { salesmen.add(s); saveLocalData(); }
  void deleteSalesman(String id) { salesmen.removeWhere((x) => x.id == id); saveLocalData(); }
  
  void addDispatch(DispatchRecord r) { dispatches.add(r); saveLocalData(); }
  void updateDispatch(DispatchRecord r) {
    int idx = dispatches.indexWhere((x) => x.id == r.id);
    if (idx != -1) dispatches[idx] = r; else dispatches.add(r);
    saveLocalData();
  }
  void deleteDispatch(String id) { dispatches.removeWhere((x) => x.id == id); saveLocalData(); }
  
  void addSettlement(Settlement s) { settlements.add(s); saveLocalData(); }
  void deleteSettlement(String id) { settlements.removeWhere((x) => x.id == id); saveLocalData(); }
  
  void addPayment(PaymentRecord p) { paymentLedger.add(p); saveLocalData(); }
  void deletePayment(String id) { paymentLedger.removeWhere((x) => x.id == id); saveLocalData(); }
}
