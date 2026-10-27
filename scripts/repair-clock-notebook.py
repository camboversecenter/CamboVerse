"""Back up and prepare the user's clock notebook for a reproducible Kaggle run."""
import ast,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=Path('C:/Users/PC/Downloads/wat-phnom-clock-3dgs-preview-training.ipynb')
notebook=json.loads(source.read_text(encoding='utf-8'))
assert len(notebook['cells'])==12
for cell in notebook['cells']:
    if isinstance(cell['source'],list):cell['source']=''.join(cell['source'])
backup=ROOT/'notebooks/wat_phnom_clock_kaggle_original_20261026.ipynb'
if not backup.exists():backup.write_text(json.dumps(notebook,indent=1),encoding='utf-8')
notebook['cells'][4]['source']=(ROOT/'notebooks/clock_setup_kaggle.py').read_text(encoding='utf-8')
notebook['cells'][5]['source']=notebook['cells'][5]['source'].replace('subprocess.run(process_command, check=True)','run_stage("alignment", process_command)')
notebook['cells'][7]['source']=notebook['cells'][7]['source'].replace('    "--vis", "tensorboard",','    "--vis", "tensorboard",\n    "--pipeline.datamanager.cache-images", "cpu",').replace('subprocess.run(train_command, check=True)','run_stage("training", train_command)')
notebook['cells'][10]['source']=notebook['cells'][10]['source'].replace('"software": {"torch": torch.__version__, "cuda": torch.version.cuda,\n                 "nerfstudio": version("nerfstudio"), "gpu": gpu_name},','"software": TRAINING_SOFTWARE,')
notebook['cells'][9]['source']=notebook['cells'][9]['source'].replace('    packed = np.zeros(len(order), dtype=[','    assert len(order) > 0, "Filtering removed all Gaussians; preserve raw PLY and inspect thresholds."\n    packed = np.zeros(len(order), dtype=[')
for index,cell in enumerate(notebook['cells']):
    ast.parse(cell['source'],filename=f'clock-cell-{index+1}')
    cell['execution_count']=None;cell['outputs']=[]
    (ROOT/'notebooks'/f'clock-cell-{index+1:02}.py').write_text(cell['source'],encoding='utf-8')
target=ROOT/'notebooks/train_wat_phnom_clock_3dgs_kaggle.ipynb'
target.write_text(json.dumps(notebook,indent=1),encoding='utf-8')
print('Validated all 12 code cells:',target)
