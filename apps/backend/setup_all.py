"""
Complete setup for Skill Gap Analysis
Runs all setup steps automatically
"""
import subprocess
import sys

def run_step(name, command):
    """Run a setup step"""
    print(f"\n{'='*60}")
    print(f"🔧 {name}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(
            [sys.executable] + command.split(),
            capture_output=True,
            text=True,
            cwd='.'
        )
        
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        
        if result.returncode == 0:
            print(f"✅ {name} completed successfully")
            return True
        else:
            print(f"❌ {name} failed")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🚀 Skill Gap Analysis - Complete Setup")
    print("="*60)
    
    steps = [
        ("Database Migration", "run_migration.py"),
        ("CV Parser Test", "test_cv_parser.py"),
        ("Neo4j Sample Data", "create_sample_data.py"),
    ]
    
    results = []
    for name, script in steps:
        success = run_step(name, script)
        results.append((name, success))
    
    # Summary
    print("\n" + "="*60)
    print("📊 Setup Summary")
    print("="*60)
    
    for name, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {name}")
    
    all_success = all(success for _, success in results)
    
    if all_success:
        print("\n" + "="*60)
        print("🎉 All setup steps completed successfully!")
        print("="*60)
        print("\n📚 Next steps:")
        print("1. Start backend: uvicorn app.main:app --reload")
        print("2. Start frontend: cd ../frontend && npm run dev")
        print("3. Visit: http://localhost:3000/skill-gap")
        print("\n📖 API Docs: http://localhost:8000/docs#/skill-gap")
    else:
        print("\n⚠️  Some steps failed. Please check the errors above.")
    
    return all_success

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
