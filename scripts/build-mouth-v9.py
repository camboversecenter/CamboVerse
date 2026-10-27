"""Connected oral cutaway, using the unchanged V7 body registration.
Illustrative anatomy only. V8 and V7 files are retained.
"""
from pathlib import Path
source=Path(__file__).with_name('build-mouth-v8.py')
text=source.read_text().replace('lab-head-fitted-v8','lab-head-fitted-v9').replace('V8 oral','V9 oral')
addition='''
# Continue the parotid duct through the cheek to the cavity instead of leaving
# its medial end floating. The cheek cutaway stays open anteriorly.
code=code.replace("(s*2.7,4.8,4.0)","(s*2.12,4.8,4.0),(s*1.94,4.65,4.0)")
code=code.replace("h.ellipsoid('Parotid gland'", "h.ellipsoid('Buccal wall cutaway',(s*2.08,4.45,3.85),(.22,1.35,1.45),palate)\\n  h.ellipsoid('Parotid gland'")
code=code.replace("(s*2.5,2.9,2.7)","(s*2.7,2.65,2.5),(s*2.5,2.9,2.7)")
code=code.replace("(s*.45,3.3,5.1)","(s*.45,3.18,4.9)")
'''
text=text.replace('exec(code,scope)',addition+'\nexec(code,scope)')
exec(compile(text,str(source),'exec'),{'__file__':str(source)})
