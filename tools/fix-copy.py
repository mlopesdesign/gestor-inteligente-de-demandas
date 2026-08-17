import shutil
src = r'E:\Projetos\LOPES FOCUS\dist\GestorInteligenteDeDemandas\resources.neu'
dst = r'C:\Program Files\Gestor Inteligente de Demandas\resources.neu'
import os
if os.path.exists(dst):
    os.remove(dst)
shutil.copy2(src, dst)
print(f'copied: {os.path.getsize(dst)} bytes')
