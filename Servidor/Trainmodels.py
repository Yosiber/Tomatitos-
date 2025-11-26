import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import ResNet50, EfficientNetB0, MobileNetV2
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.optimizers import Adam
import os

TRAIN_DIR = "dataset/train"
VAL_DIR = "dataset/val"
IMG_SIZE = (224, 224)
BATCH_SIZE = 16
EPOCHS = 20
MODEL_SAVE_DIR = "models"

# ===============================
# DATA AUGMENTATION
# ===============================
datagen_train = ImageDataGenerator(
    rescale=1.0/255,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    horizontal_flip=True
)

datagen_val = ImageDataGenerator(rescale=1.0/255)

train_gen = datagen_train.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical'
)

val_gen = datagen_val.flow_from_directory(
    VAL_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical'
)

NUM_CLASSES = len(train_gen.class_indices)

# ===============================
# MODEL CREATION
# ===============================
def create_model(base_model_class, input_shape=(224, 224, 3), num_classes=4):
    base_model = base_model_class(
        include_top=False,
        weights='imagenet',
        input_shape=input_shape
    )
    base_model.trainable = False

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.3)(x)
    predictions = Dense(num_classes, activation='softmax')(x)

    model = Model(inputs=base_model.input, outputs=predictions)
    model.compile(
        optimizer=Adam(learning_rate=0.0001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    return model

# ===============================
# TRAIN ALL MODELS
# ===============================
def train_all_models():
    models_to_train = {
        "ResNet50": ResNet50,
        "EfficientNetB0": EfficientNetB0,
        "MobileNetV2": MobileNetV2
    }

    results = []
    os.makedirs(MODEL_SAVE_DIR, exist_ok=True)

    for name, model_class in models_to_train.items():
        print(f"\n🧠 Entrenando modelo: {name}")
        model = create_model(model_class, input_shape=(224, 224, 3), num_classes=NUM_CLASSES)

        history = model.fit(
            train_gen,
            validation_data=val_gen,
            epochs=EPOCHS,
            verbose=1
        )

        val_acc = history.history['val_accuracy'][-1]
        val_loss = history.history['val_loss'][-1]

        model_path = os.path.join(MODEL_SAVE_DIR, f"{name}.keras")
        model.save(model_path)

        results.append({
            "model_name": name,
            "val_accuracy": round(val_acc * 100, 2),
            "val_loss": round(val_loss, 4),
            "path": model_path
        })

    return results

# ===============================
# MAIN
# ===============================
if __name__ == "__main__":
    print("🚀 Iniciando entrenamiento de modelos...")
    
    results = train_all_models()

    print("\n🏁 Entrenamiento completado!")
    print("📊 Resultados finales:")
    for r in results:
        print(f" - {r['model_name']}: val_accuracy={r['val_accuracy']}%, val_loss={r['val_loss']}")
