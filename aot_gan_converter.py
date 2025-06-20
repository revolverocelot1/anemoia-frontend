#!/usr/bin/env python3
"""
AOT-GAN Model Converter for Web Deployment
"""

import argparse
import os
import torch
import torch.nn as nn
import onnx

class AOTBlock(nn.Module):
    def __init__(self, dim, dilation=1):
        super(AOTBlock, self).__init__()
        self.conv1 = nn.Conv2d(dim, dim, kernel_size=3, padding=dilation, dilation=dilation)
        self.conv2 = nn.Conv2d(dim, dim, kernel_size=3, padding=1)
        self.norm1 = nn.InstanceNorm2d(dim)
        self.norm2 = nn.InstanceNorm2d(dim)
        self.activation = nn.ReLU(inplace=True)
        
    def forward(self, x):
        residual = x
        out = self.conv1(x)
        out = self.norm1(out)
        out = self.activation(out)
        out = self.conv2(out)
        out = self.norm2(out)
        out = out + residual
        out = self.activation(out)
        return out

class AOTGenerator(nn.Module):
    def __init__(self, input_channels=4, output_channels=3, ngf=64, n_blocks=8):
        super(AOTGenerator, self).__init__()
        
        self.encoder = nn.Sequential(
            nn.Conv2d(input_channels, ngf, kernel_size=7, padding=3),
            nn.InstanceNorm2d(ngf),
            nn.ReLU(inplace=True),
            nn.Conv2d(ngf, ngf * 2, kernel_size=4, stride=2, padding=1),
            nn.InstanceNorm2d(ngf * 2),
            nn.ReLU(inplace=True),
            nn.Conv2d(ngf * 2, ngf * 4, kernel_size=4, stride=2, padding=1),
            nn.InstanceNorm2d(ngf * 4),
            nn.ReLU(inplace=True),
        )
        
        self.aot_blocks = nn.ModuleList()
        for i in range(n_blocks):
            dilation = 2 ** (i % 3 + 1)
            self.aot_blocks.append(AOTBlock(ngf * 4, dilation))
        
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(ngf * 4, ngf * 2, kernel_size=4, stride=2, padding=1),
            nn.InstanceNorm2d(ngf * 2),
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(ngf * 2, ngf, kernel_size=4, stride=2, padding=1),
            nn.InstanceNorm2d(ngf),
            nn.ReLU(inplace=True),
            nn.Conv2d(ngf, output_channels, kernel_size=7, padding=3),
            nn.Tanh()
        )
        
    def forward(self, x):
        features = self.encoder(x)
        for aot_block in self.aot_blocks:
            features = aot_block(features)
        output = self.decoder(features)
        return output

class WebOptimizedInpainter(nn.Module):
    def __init__(self):
        super(WebOptimizedInpainter, self).__init__()
        self.generator = AOTGenerator(input_channels=4, output_channels=3)
        
    def forward(self, image, mask):
        input_tensor = torch.cat([image, mask], dim=1)
        generated = self.generator(input_tensor)
        inpainted = image * (1 - mask) + generated * mask
        return inpainted

def convert_model_to_onnx(model_path=None, output_dir="public/models/", model_name="aot-gan-inpainting"):
    print("Converting AOT-GAN model to ONNX format...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    model = WebOptimizedInpainter()
    
    if model_path and os.path.exists(model_path):
        print(f"Loading model from {model_path}")
        checkpoint = torch.load(model_path, map_location='cpu')
        if 'state_dict' in checkpoint:
            model.load_state_dict(checkpoint['state_dict'])
        else:
            model.load_state_dict(checkpoint)
    else:
        print("Using randomly initialized model (for demonstration)")
    
    model.eval()
    
    batch_size = 1
    height, width = 512, 512
    
    dummy_image = torch.randn(batch_size, 3, height, width)
    dummy_mask = torch.randn(batch_size, 1, height, width)
    
    onnx_path = os.path.join(output_dir, f"{model_name}.onnx")
    
    torch.onnx.export(
        model,
        (dummy_image, dummy_mask),
        onnx_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['image', 'mask'],
        output_names=['inpainted_image'],
        verbose=False
    )
    
    print(f"ONNX Model saved: {onnx_path}")
    return onnx_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert AOT-GAN model to ONNX')
    parser.add_argument('--model_path', type=str, help='Path to PyTorch model file')
    parser.add_argument('--output_dir', type=str, default='public/models/', help='Output directory')
    parser.add_argument('--model_name', type=str, default='aot-gan-inpainting', help='Output model name')
    
    args = parser.parse_args()
    
    convert_model_to_onnx(
        model_path=args.model_path,
        output_dir=args.output_dir,
        model_name=args.model_name
    )
