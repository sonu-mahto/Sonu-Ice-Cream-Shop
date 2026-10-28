import urllib.request
import json

def check_subcollections():
    base_url = 'https://firestore.googleapis.com/v1/projects/sonu-ice-cream-shop/databases/(default)/documents/ice_cream_shops/Sonu1_data'
    subcols = ['dispatches', 'settlements', 'paymentLedger', 'products', 'salesmen']
    
    print("Checking Sonu1_data subcollections:")
    for col in subcols:
        try:
            url = f"{base_url}/{col}"
            req = urllib.request.urlopen(url)
            data = json.loads(req.read())
            docs = data.get('documents', [])
            print(f"  Subcollection '{col}': {len(docs)} documents found")
            if docs:
                for doc in docs[:3]: # print first 3 docs
                    doc_name = doc['name'].split('/')[-1]
                    print(f"    - Doc ID: {doc_name}")
        except Exception as e:
            print(f"  Error reading subcollection '{col}': {e}")

if __name__ == '__main__':
    check_subcollections()
